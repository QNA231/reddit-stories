const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// CẤU HÌNH
const VIDEOS_TO_MAKE = 1;       // Số lượng video muốn làm
const WAIT_TIME_MINUTES = 60;    // Thời gian nghỉ (phút)

// Hàm chạy lệnh bằng SPAWN (Khắc phục lỗi tràn bộ nhớ)
const runCommand = (command, args) => {
    return new Promise((resolve, reject) => {
        console.log(`\n> Đang chạy lệnh: ${command} ${args.join(' ')}`);
        
        // 'inherit' giúp in log trực tiếp ra terminal, không qua bộ nhớ đệm
        const child = spawn(command, args, { stdio: 'inherit', shell: true });

        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Lệnh thất bại với mã lỗi: ${code}`));
        });
        
        child.on('error', (err) => {
            reject(err);
        });
    });
};

const wait = (minutes) => {
    return new Promise(resolve => {
        console.log(`\n☕ Đã xong video! Máy sẽ nghỉ ngơi trong ${minutes} phút...`);
        let secondsLeft = minutes * 60;
        const timer = setInterval(() => {
            secondsLeft--;
            // Ghi đè dòng hiện tại để đếm ngược đẹp hơn
            process.stdout.write(`\r⏳ Còn lại: ${Math.floor(secondsLeft / 60)}p ${secondsLeft % 60}s...   `);
            if (secondsLeft <= 0) {
                clearInterval(timer);
                console.log("\n🚀 Tiếp tục!");
                resolve();
            }
        }, 1000);
    });
};

async function main() {
    console.log(`=== START AUTO MANAGER (Fix Buffer Overflow) ===`);

    for (let i = 1; i <= VIDEOS_TO_MAKE; i++) {
        console.log(`\n🎬 [VIDEO ${i}/${VIDEOS_TO_MAKE}]`);

        try {
            // BƯỚC 1: TẠO NỘI DUNG
            await runCommand('node', ['free-generate.js']);

            // BƯỚC 2: RENDER
            const timeStamp = new Date().getTime();
            const outputName = `out/video_${timeStamp}.mp4`;
            
            // Dùng cấu hình từ remotion.config.ts (Không cần --concurrency ở đây nữa)
            await runCommand('npx', [
                'remotion', 'render', 
                'src/index.tsx', 
                'MyRedditVideo', 
                outputName
            ]);

            console.log(`✅ [DONE] Video lưu tại: ${outputName}`);

            if (i < VIDEOS_TO_MAKE) await wait(WAIT_TIME_MINUTES);

        } catch (error) {
            console.error("\n❌ LỖI:", error.message);
            await wait(1); // Đợi 1 phút rồi thử lại nếu lỗi
        }
    }
}

main();