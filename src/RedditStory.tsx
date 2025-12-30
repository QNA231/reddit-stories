import React from 'react';
import { AbsoluteFill, Audio, Video, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Word } from './Word';
import { Watermark } from './Watermark';
import data from './data.json';

export const RedditStory = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

    // 1. Lấy tốc độ mong muốn
    const speed = data.videoSpeed || 1;

    // 2. Tính "Thời gian thực tế" vs "Thời gian trong kịch bản"
    // currentTimeMs: Là thời gian đang trôi trên thanh timeline của trình dựng
    const currentTimeMs = (frame / fps) * 1000;
    
    // adjustedTimeMs: Là thời gian đã trôi qua trong "thế giới nhanh"
    // Ví dụ: Mới trôi qua 1 giây (currentTime), nhưng vì tua nhanh 1.5x 
    // nên ta coi như đã đọc được 1.5 giây nội dung (adjustedTime).
    const adjustedTimeMs = currentTimeMs * speed;

    // 3. Logic hiển thị chữ (Paging) - Dùng adjustedTimeMs để so sánh
    const activeIndex = data.captions.findIndex(
        c => adjustedTimeMs >= c.startMs && adjustedTimeMs <= c.endMs
    );
    
    const currentWordIndex = activeIndex !== -1 
        ? activeIndex 
        : data.captions.filter(c => c.startMs < adjustedTimeMs).length - 1;

    const WORDS_PER_PAGE = 12; // Số từ mỗi trang
    const pageIndex = Math.floor(Math.max(0, currentWordIndex) / WORDS_PER_PAGE);
    const startIndex = pageIndex * WORDS_PER_PAGE;
    const visibleCaptions = data.captions.slice(startIndex, startIndex + WORDS_PER_PAGE);

	return (
		<AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* VIDEO NỀN */}
			<AbsoluteFill>
                <Video 
                    src={staticFile(data.backgroundUrl)}
                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                    volume={0.1}
                    loop
                    // Tăng tốc video nền (Nếu muốn nền còn nhanh hơn giọng đọc thì nhân thêm, vd: speed * 1.2)
                    playbackRate={speed} 
                />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.2)' }}></div>
				
				
				{/* WATERMARK */}
				<Watermark text="@RedditStories" />
			</AbsoluteFill>

            {/* AUDIO GIỌNG ĐỌC */}
            {/* Thuộc tính playbackRate sẽ tua nhanh giọng đọc mà không làm méo tiếng (giữ cao độ) */}
			<Audio 
                src={staticFile(data.audioUrl)} 
                playbackRate={speed} 
            />
            
            {/* TIÊU ĐỀ */}
            <AbsoluteFill style={{ top: 150, alignItems: 'center' }}>
                <div style={{ backgroundColor: 'white', padding: '15px 30px', borderRadius: '15px', width: '85%', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.5)', zIndex: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 26, fontFamily: 'Arial', color: '#B22222', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {data.title}
                    </h2>
                </div>
            </AbsoluteFill>

            {/* CHỮ CHẠY */}
			<AbsoluteFill style={{ alignItems: 'end', height: 'auto', flexDirection: 'row' }}>
				<div style={{ lineHeight: '1.6', textAlign: 'center', marginBottom: '123px', filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.4))' }}>
					{visibleCaptions.map((caption, index) => {
                        // Logic hiển thị màu chữ cũng phải dựa trên adjustedTimeMs
						const isActive = adjustedTimeMs >= caption.startMs && adjustedTimeMs <= caption.endMs;
						return <Word key={startIndex + index} text={caption.text} active={isActive} />;
					})}
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};