import { registerRoot, Composition } from 'remotion';
import { RedditStory } from './RedditStory';
import data from './data.json';

export const RemotionRoot: React.FC = () => {
    // Lấy tốc độ từ data (mặc định là 1 nếu không có)
    const speed = data.videoSpeed || 1;

    // Tính toán lại tổng số Frame cần thiết
    // Công thức: (Tổng giây / Tốc độ) * 30 fps
    // Ví dụ: 100 giây / 1.5 tốc độ = 66 giây thực tế
    const durationInFrames = Math.ceil((data.durationInSeconds / speed) * 60);

	return (
		<>
			<Composition
				id="MyRedditVideo"
				component={RedditStory}
				durationInFrames={durationInFrames} // Đã co ngắn lại
				fps={60}
				width={1080}
				height={1920}
			/>
		</>
	);
};

registerRoot(RemotionRoot);