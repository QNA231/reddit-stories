require('dotenv').config();
const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const fetch = require('node-fetch');

// CẤU HÌNH
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const parser = new Parser();

// Hàm tạo độ trễ để tránh bị Google ban IP
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Bắt đầu tạo Video Nosleep (Clean Voice)...");

  try {
    // 1. LẤY BÀI TỪ NOSLEEP
    console.log("1️⃣ Đang quét r/nosleep...");
    const response = await fetch('https://www.reddit.com/r/nosleep/top/.rss?t=week', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
    });
    
    if (!response.ok) throw new Error("Lỗi kết nối Reddit");
    const feed = await parser.parseString(await response.text());
    
    const candidates = feed.items.filter(i => (i.content || i.contentSnippet || "").length > 1000);
    if (candidates.length === 0) throw new Error("Không có truyện nào đủ dài!");
    
    const post = candidates[Math.floor(Math.random() * Math.min(candidates.length, 5))];
    console.log(`   -> Truyện gốc: "${post.title}"`);

    let rawContent = (post.content || post.contentSnippet || "").replace(/<[^>]*>?/gm, ' ').trim();
    if (rawContent.length > 15000) rawContent = rawContent.substring(0, 15000) + "..."; 

    // 2. DỊCH THUẬT & VIẾT LẠI
    console.log("2️⃣ Đang dịch sang tiếng Việt...");
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    // --------------------------------------------------------
    
    const prompt = `
      Dịch câu chuyện kinh dị này sang tiếng Việt.
      Yêu cầu:
      - Giữ nguyên ngôi "Tôi".
      - Văn phong rùng rợn, kể chuyện lôi cuốn.
      - KHÔNG dùng định dạng Markdown (như dấu sao *, dấu thăng #).
      - KHÔNG tóm tắt, dịch đầy đủ chi tiết.
      - Chỉ trả về nội dung văn bản thuần túy.
      
      Tiêu đề: ${post.title}
      Nội dung: ${rawContent}
    `;

    const result = await model.generateContent(prompt);
    let translatedScript = result.response.text().trim();

    console.log("🧹 Đang dọn dẹp ký tự lạ (*, #)...");
    translatedScript = translatedScript
        .replace(/\*/g, '')      
        .replace(/#/g, '')       
        .replace(/["']/g, '')    
        .replace(/\(.*\)/g, '')  
        .replace(/\s+/g, ' ');   

    // 3. TẠO AUDIO (CÓ DELAY AN TOÀN)
    console.log("3️⃣ Đang tạo Audio (An toàn)...");
    const audioUrls = googleTTS.getAllAudioUrls(translatedScript, {
      lang: 'vi', slow: false, host: 'https://translate.google.com', splitPunct: ',.?!',
    });

    const mp3Path = path.resolve('./public/voice.mp3');
    const writeStream = fs.createWriteStream(mp3Path);

    for (const item of audioUrls) {
        try {
            const res = await fetch(item.url);
            if (res.ok) {
                const buffer = await res.buffer();
                writeStream.write(buffer);
                // --- FIX 2: THÊM DELAY ĐỂ KHÔNG BỊ LỖI TTS ---
                process.stdout.write("."); 
                await sleep(1000); // Nghỉ 1 giây mỗi đoạn
            } else {
                console.error("   ❌ Lỗi tải audio. Đợi 5s...");
                await sleep(5000);
            }
        } catch (err) {
            console.error("Lỗi mạng:", err.message);
        }
    }
    writeStream.end();
    console.log("\n");
    await new Promise(resolve => writeStream.on('finish', resolve));

    // 4. TÍNH TOÁN
    console.log("4️⃣ Đang tính toán thời lượng...");
    const durationSec = await getAudioDurationInSeconds(mp3Path);
    const words = translatedScript.split(/\s+/);
    const timePerWord = (durationSec * 1000) / words.length;

    const captions = words.map((word, index) => ({
      text: word, startMs: index * timePerWord, endMs: (index + 1) * timePerWord
    }));

    // 5. RANDOM BG VIDEO
    console.log("🎥 Đang chọn video nền ngẫu nhiên...");
    
    const publicDir = path.resolve('./public');
    const files = fs.readdirSync(publicDir);

    const bgFiles = files.filter(file => 
        file.toLowerCase().startsWith('bg') && 
        file.toLowerCase().endsWith('.mp4')
    );

    let selectedBackground = "gameplay.mp4"; 
    
    if (bgFiles.length > 0) {
        selectedBackground = bgFiles[Math.floor(Math.random() * bgFiles.length)];
        console.log(`   -> Đã chọn: ${selectedBackground}`);
    } else {
        console.warn("   ⚠️ Không tìm thấy file 'bg*.mp4' nào, kiểm tra lại thư mục public!");
    }

    // 6. LƯU DATA
    const finalData = {
      title: "Chuyện Ma Reddit",
      audioUrl: "voice.mp3",
      
      // --- FIX 3: DÙNG BIẾN ĐÃ RANDOM THAY VÌ HARDCODE ---
      backgroundUrl: selectedBackground, 
      // --------------------------------------------------
      
      videoSpeed: 1.5, 
      durationInSeconds: durationSec,
      captions: captions
    };

    fs.writeFileSync(path.resolve('./src/data.json'), JSON.stringify(finalData, null, 2));
    console.log("✅ XONG! Đã cập nhật data.json");

  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
}

main();