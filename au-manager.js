const { exec } = require('child_process');
const fs = require('fs');

// CẤU HÌNH
const VIDEOS_TO_MAKE = 1;       // Số lượng video muốn làm trong phiên này
const WAIT_TIME_MINUTES = 180;   // Thời gian nghỉ giữa các video (phút)

// Hàm chạy lệnh Terminal từ bên trong Node.js
const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        console.log(`\n> Đang chạy lệnh: ${command}`);
        const process = exec(command);

        // Hiện log ra màn hình để bạn theo dõi
        process.stdout.on('data', (data) => console.log(data.toString()));
        process.stderr.on('data', (data) => console.error(data.toString()));

        process.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Lỗi lệnh ${command}`));
        });
    });
};

// Hàm chờ đợi (Đếm ngược)
const wait = (minutes) => {
    return new Promise(resolve => {
        console.log(`\n☕ Đã xong video! Máy sẽ nghỉ ngơi trong ${minutes} phút...`);
        let secondsLeft = minutes * 60;

        const timer = setInterval(() => {
            secondsLeft--;
            process.stdout.write(`\r⏳ Còn lại: ${Math.floor(secondsLeft / 60)} phút ${secondsLeft % 60} giây...   `);

            if (secondsLeft <= 0) {
                clearInterval(timer);
                console.log("\n\n🚀 Hết giờ nghỉ! Bắt đầu làm video tiếp theo.");
                resolve();
            }
        }, 1000);
    });
};

async function main() {
    const startTime = new Date();
    console.log(`=== BẮT ĐẦU TREO MÁY LÚC ${startTime.toLocaleTimeString()} ===`);

    for (let i = 1; i <= VIDEOS_TO_MAKE; i++) {
        console.log(`\n🎬 [VIDEO ${i}/${VIDEOS_TO_MAKE}] Đang khởi tạo...`);

        try {
            // BƯỚC 1: TẠO NỘI DUNG (Chạy file free-generate.js)
            await runCommand('node free-generate.js');

            // BƯỚC 2: RENDER VIDEO (Chạy lệnh build của Remotion)
            // Đặt tên file đầu ra theo thời gian để không bị trùng (vd: video_1530.mp4)
            const timeStamp = new Date().getTime();
            const outputName = `out/video_${timeStamp}.mp4`;

            // Lưu ý: --concurrency=6 là tối ưu cho máy i3-14100 RAM 16GB
            // Thêm "MyRedditVideo" vào đây để Remotion biết cần render cái gì
            await runCommand(`npx remotion render src/index.tsx MyRedditVideo ${outputName} --concurrency=2`);

            console.log(`✅ [HOÀN TẤT VIDEO ${i}] File lưu tại: ${outputName}`);

            // BƯỚC 3: NGHỈ NGƠI (Nếu chưa phải video cuối cùng)
            if (i < VIDEOS_TO_MAKE) {
                await wait(WAIT_TIME_MINUTES);
            }

        } catch (error) {
            console.error("❌ CÓ LỖI XẢY RA:", error);
            // Nếu lỗi thì vẫn đợi 1 chút rồi thử video sau, không dừng hẳn
            await wait(1);
        }
    }

    console.log("\n🎉🎉🎉 ĐÃ HOÀN THÀNH TẤT CẢ VIDEO! BẠN CÓ THỂ TẮT MÁY.");
}

main();