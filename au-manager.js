const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// CẤU HÌNH
const VIDEOS_TO_MAKE = 5;
const WAIT_TIME_MINUTES = 5;

const runCommand = (command, args) => {
    return new Promise((resolve, reject) => {
        console.log(`\n> RUN: ${command} ...`); 
        
        const child = spawn(command, args, { stdio: 'inherit', shell: true });
        child.on('close', code => code === 0 ? resolve() : reject(new Error(`Exit code: ${code}`)));
        child.on('error', reject);
    });
};

const wait = (minutes) => {
    return new Promise(resolve => {
        console.log(`\n☕ Nghỉ ngơi ${minutes} phút...`);
        setTimeout(resolve, minutes * 60 * 1000);
    });
};

async function main() {
    console.log(`=== AUTO MANAGER (FIX PROGRESS BAR) ===`);

    for (let i = 1; i <= VIDEOS_TO_MAKE; i++) {
        try {
            // 1. TẠO NỘI DUNG
            await runCommand('node', ['free-generate.js']);
            
            const dataPath = path.resolve('./src/data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            const bgFileName = data.backgroundUrl || 'bg1.mp4';
            const bgPath = path.resolve('./public', bgFileName);

            const timeStamp = new Date().getTime();
            const greenVideo = `out/temp_green_${timeStamp}.mp4`;
            const finalVideo = `out/video_${timeStamp}.mp4`;

            // 2. GIAI ĐOẠN 1: REMOTION RENDER
            console.log("\n🟢 GĐ1: Render Chữ (Màn hình xanh)...");
            
            // --- ĐÃ XÓA '--quiet' ĐỂ HIỆN THANH TIẾN TRÌNH ---
            await runCommand('npx', [
                'remotion', 'render', 'src/index.tsx', 'MyRedditVideo', greenVideo,
                '--gl=angle',
                '--concurrency=4',
                '--jpeg-quality=80'
                // Đã xóa dòng '--quiet' ở đây
            ]);

            // 3. GIAI ĐOẠN 2: FFMPEG GHÉP VIDEO (Vẫn giữ im lặng cho gọn)
            console.log("\n🟣 GĐ2: Đang ghép nền (Vui lòng đợi 1-2 phút)...");
            
            await runCommand('ffmpeg', [
                '-hide_banner',       
                '-loglevel', 'error', // Chỉ hiện lỗi
                '-stream_loop', '-1',
                
                '-i', bgPath,
                '-i', greenVideo,
                '-filter_complex', '"[1:v]colorkey=0x00FF00:0.1:0.2[ckout];[0:v][ckout]overlay[out]"',
                '-map', '[out]',
                '-map', '1:a',
                
                '-c:v', 'libx264', 
                '-preset', 'ultrafast', 
                '-crf', '25',
                '-shortest',
                '-y',
                finalVideo
            ]);

            console.log(`\n✅ XONG! Video lưu tại: ${finalVideo}`);

            // 4. Dọn dẹp
            if (fs.existsSync(greenVideo)) fs.unlinkSync(greenVideo);

            if (i < VIDEOS_TO_MAKE) await wait(WAIT_TIME_MINUTES);

        } catch (error) {
            console.error("❌ LỖI:", error.message);
        }
    }
}

main();