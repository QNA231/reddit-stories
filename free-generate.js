const fs = require('fs-extra');
const axios = require('axios');
const googleTTS = require('google-tts-api');
const { translate } = require('@vitalets/google-translate-api');
const path = require('path');
const getMP3Duration = require('get-mp3-duration'); // <-- THƯ VIỆN MỚI

// --- CẤU HÌNH ---
const SUBREDDITS = ['nosleep', 'shortscarystories', 'Glitch_in_the_Matrix']; 
const HISTORY_FILE = 'history.json'; 
const OUTPUT_FILE = 'src/data.json';

// Hàm lấy truyện từ Reddit
async function getRedditStory() {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }

    for (const sub of SUBREDDITS) {
        console.log(`\n🔍 Đang tìm truyện mới tại r/${sub}...`);
        try {
            const res = await axios.get(`https://www.reddit.com/r/${sub}/top.json?t=week&limit=20`);
            const posts = res.data.data.children;

            for (const post of posts) {
                const p = post.data;
                if (history.includes(p.id)) continue; 

                if (p.selftext && p.selftext.length > 500 && p.selftext.length < 5000) {
                    console.log(`✅ Đã chọn: "${p.title}"`);
                    history.push(p.id);
                    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
                    return { title: p.title, text: p.selftext, id: p.id };
                }
            }
        } catch (e) {
            console.error(`⚠️ Lỗi khi quét r/${sub}: ${e.message}`);
        }
    }
    throw new Error("❌ Không tìm được truyện nào mới!");
}

function splitText(text) {
    return text.match(/[^.?!]+[.?!]+["']?|[^.?!]+$/g) || [text];
}

async function main() {
    try {
        console.log("=== GENERATOR (AUTO-SYNC FIX) ===");
        
        // 1. LẤY TRUYỆN
        const story = await getRedditStory();

        // 2. DỊCH
        console.log("📝 Đang dịch...");
        const translatedTitle = await translate(story.title, { to: 'vi' });
        const translatedText = await translate(story.text, { to: 'vi' });
        
        // Làm sạch văn bản (xóa ký tự lạ gây lỗi hiển thị)
        const cleanTitle = translatedTitle.text;
        const cleanText = translatedText.text.replace(/[*_#]/g, '').replace(/\s+/g, ' ').trim();

        // 3. TẠO AUDIO (DEMO ĐOẠN ĐẦU)
        console.log("🔊 Đang tạo Audio (Google TTS)...");
        
        // Google TTS Free giới hạn ký tự, ta lấy khoảng 2000 ký tự đầu (~3-4 phút) để demo
        // Nếu muốn làm full, cần logic cắt nhỏ phức tạp hơn.
        const textToSpeak = cleanText.length > 2000 ? cleanText.substring(0, 2000) + "..." : cleanText;
        
        const publicDir = path.resolve('public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
        const audioPath = path.join(publicDir, 'voice.mp3');
        
        const audioBase64 = await googleTTS.getAllAudioBase64(textToSpeak, {
            lang: 'vi',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        });

        const buffer = Buffer.concat(audioBase64.map(item => Buffer.from(item.base64, 'base64')));
        fs.writeFileSync(audioPath, buffer);
        
        // --- 4. TÍNH TOÁN SUBTITLE THÔNG MINH (KEY FIX) ---
        console.log("⏱️  Đang đồng bộ Subtitle với Audio...");
        
        // A. Lấy chính xác thời lượng file audio (tính bằng mili-giây)
        const durationInMs = getMP3Duration(buffer);
        console.log(`   -> Độ dài Audio: ${(durationInMs/1000).toFixed(2)} giây`);

        // B. Tách từ
        const words = textToSpeak.split(/\s+/);
        
        // C. Tính tổng số ký tự (để chia tỷ lệ)
        const totalCharacters = textToSpeak.replace(/\s/g, '').length;
        
        let currentTime = 0;
        const captions = words.map(word => {
            // Logic mới: Từ càng dài -> Thời gian hiển thị càng lâu
            const wordLength = word.length;
            
            // Công thức: (Độ dài từ / Tổng độ dài văn bản) * Tổng thời lượng Audio
            // Thêm hệ số 1.05 để bù trừ khoảng lặng giữa các câu
            const wordDuration = (wordLength / totalCharacters) * durationInMs;
            
            // Đảm bảo tối thiểu 200ms cho mỗi từ để không bị lướt quá nhanh
            const finalDuration = Math.max(wordDuration, 200); 

            const start = currentTime;
            const end = start + finalDuration;
            
            // Cập nhật lại currentTime cho từ tiếp theo
            // Tuy nhiên, để khớp tổng thời lượng, ta nên dùng tỉ lệ thuần túy
            // Nhưng ở đây ta dùng hybrid: Tỉ lệ + điều chỉnh start point
            
            // Cách đơn giản nhất và chính xác nhất cho TTS đều đều:
            // Phân phối lại start/end dựa trên tỷ lệ tích lũy
            return {
                text: word,
                wordLength: wordLength // Lưu tạm để tính toán bên dưới
            };
        });

        // TÍNH LẠI TIMESTAMPS CHÍNH XÁC DỰA TRÊN TỶ LỆ PHẦN TRĂM
        let accumulatedChars = 0;
        const finalCaptions = captions.map(c => {
            const startPct = accumulatedChars / totalCharacters;
            accumulatedChars += c.wordLength;
            const endPct = accumulatedChars / totalCharacters;

            return {
                text: c.text,
                startMs: startPct * durationInMs,
                endMs: endPct * durationInMs
            };
        });

        // 5. CHỌN BACKGROUND
        const bgFiles = fs.readdirSync(publicDir).filter(f => f.startsWith('bg') && f.endsWith('.mp4'));
        const randomBg = bgFiles.length > 0 ? bgFiles[Math.floor(Math.random() * bgFiles.length)] : 'bg1.mp4';

        // 6. XUẤT DATA
        const finalData = {
            title: cleanTitle,
            audioUrl: 'voice.mp3',
            backgroundUrl: randomBg,
            captions: finalCaptions, // Sử dụng bộ caption đã tính toán kỹ
            durationInSeconds: durationInMs / 1000
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
        console.log(`✅ XONG! Subtitle đã được đồng bộ theo độ dài file audio.`);

    } catch (error) {
        console.error("❌ LỖI:", error.message);
    }
}

main();