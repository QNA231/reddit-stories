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
    
    // Lấy bài dài > 1000 ký tự
    const candidates = feed.items.filter(i => (i.content || i.contentSnippet || "").length > 1000);
    if (candidates.length === 0) throw new Error("Không có truyện nào đủ dài!");
    
    const post = candidates[Math.floor(Math.random() * Math.min(candidates.length, 5))];
    console.log(`   -> Truyện gốc: "${post.title}"`);

    // Lọc HTML rác trước khi gửi cho AI
    let rawContent = (post.content || post.contentSnippet || "").replace(/<[^>]*>?/gm, ' ').trim();
    if (rawContent.length > 15000) rawContent = rawContent.substring(0, 15000) + "..."; // Cắt nếu quá dài

    // 2. DỊCH THUẬT & VIẾT LẠI
    console.log("2️⃣ Đang dịch sang tiếng Việt...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
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

    // --- BƯỚC QUAN TRỌNG: DỌN DẸP KÝ TỰ RÁC ---
    console.log("🧹 Đang dọn dẹp ký tự lạ (*, #)...");
    translatedScript = translatedScript
        .replace(/\*/g, '')      // Xóa dấu *
        .replace(/#/g, '')       // Xóa dấu #
        .replace(/["']/g, '')    // Xóa dấu nháy (giúp giọng đọc mượt hơn)
        .replace(/\(.*\)/g, '')  // Xóa nội dung trong ngoặc đơn (thường là chú thích)
        .replace(/\s+/g, ' ');   // Xóa khoảng trắng thừa
    // ------------------------------------------

    // 3. TẠO AUDIO
    console.log("3️⃣ Đang tạo Audio...");
    const audioUrls = googleTTS.getAllAudioUrls(translatedScript, {
      lang: 'vi', slow: false, host: 'https://translate.google.com', splitPunct: ',.?!',
    });

    const mp3Path = path.resolve('./public/voice.mp3');
    const writeStream = fs.createWriteStream(mp3Path);

    for (const item of audioUrls) {
        const res = await fetch(item.url);
        const buffer = await res.buffer();
        writeStream.write(buffer);
    }
    writeStream.end();
    await new Promise(resolve => writeStream.on('finish', resolve));

    // 4. TÍNH TOÁN
    console.log("4️⃣ Đang tính toán thời lượng...");
    const durationSec = await getAudioDurationInSeconds(mp3Path);
    const words = translatedScript.split(/\s+/);
    const timePerWord = (durationSec * 1000) / words.length;

    const captions = words.map((word, index) => ({
      text: word, startMs: index * timePerWord, endMs: (index + 1) * timePerWord
    }));

    // 5. LƯU DATA (Kèm cấu hình tốc độ video)
    const finalData = {
      title: "Chuyện Ma Reddit",
      audioUrl: "voice.mp3",
      backgroundUrl: "gameplay.mp4",
      videoSpeed: 1.5, // <--- CẤU HÌNH TỐC ĐỘ Ở ĐÂY (1.5 là nhanh gấp rưỡi)
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