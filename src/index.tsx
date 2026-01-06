import { registerRoot } from 'remotion';
import { Composition } from 'remotion';
import { RedditStory } from './RedditStory';
import jsonData from './data.json'; 

export const RemotionVideo: React.FC = () => {
    // Ép kiểu any cho data để lấy thông số thoải mái
    const data: any = jsonData; 
    const duration = data.durationInSeconds || 10; 
    const fps = 30; 

    return (
        <>
            <Composition
                id="MyRedditVideo"
                
                // --- SỬA DÒNG NÀY (Thêm 'as any') ---
                // Điều này bảo TypeScript: "Đừng soi component này nữa, cứ chạy đi!"
                component={RedditStory as any}
                // ------------------------------------

                durationInFrames={Math.ceil(duration * fps)}
                fps={fps}
                width={1080}
                height={1920}
                
                defaultProps={{
                    data: jsonData as any 
                }}
            />
        </>
    );
};

registerRoot(RemotionVideo);