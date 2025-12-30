import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, random } from 'remotion';

export const Watermark = ({ text }: { text: string }) => {
	const frame = useCurrentFrame();
	const { width, height, durationInFrames } = useVideoConfig();

	// 1. CẤU HÌNH SỰ DI CHUYỂN
	// Cứ bao nhiêu frame thì đổi vị trí 1 lần? (90 frame = 3 giây)
	const interval = 90; 
	const numberOfPoints = Math.ceil(durationInFrames / interval) + 2;

	// 2. TẠO TỌA ĐỘ NGẪU NHIÊN (ĐƯỢC TÍNH TOÁN TRƯỚC)
	const positions = useMemo(() => {
		return new Array(numberOfPoints).fill(0).map((_, i) => {
            // --- SỬA ĐOẠN NÀY ---
            
			// Trục X (Ngang): Cho chạy từ 0% đến 80% chiều rộng
            // (Chừa lại 20% bên phải để chữ ko bị tràn ra ngoài màn hình)
			const x = random(`x-${i}`) * (width * 0.8);

			// Trục Y (Dọc): Cho chạy từ 0% đến 95% chiều cao
            // (Thoải mái đi lên đỉnh hoặc xuống đáy màn hình)
			const y = random(`y-${i}`) * (height * 0.95);
            
            // --------------------

			return { x, y };
		});
	}, [numberOfPoints, width, height]);

	// 3. TÍNH TOÁN VỊ TRÍ HIỆN TẠI DỰA TRÊN FRAME
	// Logic: Frame hiện tại đang nằm ở khoảng nào giữa các điểm đã tạo?
	const segmentIndex = Math.floor(frame / interval);
	const segmentProgress = frame % interval;

	// Lấy điểm bắt đầu và điểm kết thúc của chặng này
	const startPoint = positions[segmentIndex] || positions[positions.length - 1];
	const endPoint = positions[segmentIndex + 1] || positions[positions.length - 1];

	// Di chuyển mượt mà từ Start -> End
	const x = interpolate(segmentProgress, [0, interval], [startPoint.x, endPoint.x], {
		extrapolateRight: 'clamp',
	});
	const y = interpolate(segmentProgress, [0, interval], [startPoint.y, endPoint.y], {
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				// Dùng transform translate là cách tối ưu nhất cho GPU Intel Iris Xe
				transform: `translate(${x}px, ${y}px)`,
				opacity: 0.3, // Mờ mờ ảo ảo
				pointerEvents: 'none', // Không chặn chuột
			}}
		>
			<h3
				style={{
					fontFamily: 'Arial',
					fontWeight: 'bold',
					fontSize: '30px',
					color: 'white',
					margin: 0,
					// KHÔNG DÙNG drop-shadow hay blur ở đây để cứu máy i5
					// Chỉ dùng text-shadow nhẹ hoặc không dùng
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap'
				}}
			>
				{text}
			</h3>
		</div>
	);
};