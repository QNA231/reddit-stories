const fs = require('fs-extra');
const axios = require('axios');
const googleTTS = require('google-tts-api');
const { translate } = require('@vitalets/google-translate-api');
const path = require('path');

// --- CẤU HÌNH ---
const SUBREDDITS = ['nosleep', 'shortscarystories', 'Glitch_in_the_Matrix']; // Các nguồn truyện
const HISTORY_FILE = 'history.json'; // File lưu danh sách đã làm
const OUTPUT_FILE = 'src/data.json';

// Hàm lấy truyện từ Reddit (Có check trùng)
async function getRedditStory() {
    // 1. Đọc lịch sử
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }

    // 2. Duyệt qua các subreddit để tìm bài mới
    for (const sub of SUBREDDITS) {
        console.log(`\n🔍 Đang tìm truyện mới tại r/${sub}...`);
        
        try {
            // Lấy top trong tuần
            const res = await axios.get(`https://www.reddit.com/r/${sub}/top.json?t=week&limit=20`);
            const posts = res.data.data.children;

            for (const post of posts) {
                const p = post.data;
                
                // --- LOGIC CHECK TRÙNG QUAN TRỌNG ---
                if (history.includes(p.id)) {
                    // console.log(`   Skipped: ${p.title} (Đã làm rồi)`);
                    continue; // Bỏ qua, xét bài tiếp theo
                }

                // Nếu chưa làm, và nội dung đủ dài, lấy bài này!
                if (p.selftext && p.selftext.length > 500 && p.selftext.length < 5000) {
                    console.log(`✅ Đã chọn: "${p.title}" (ID: ${p.id})`);
                    
                    // Lưu ngay ID vào lịch sử để không bị trùng lần sau
                    history.push(p.id);
                    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
                    
                    return { title: p.title, text: p.selftext, id: p.id };
                }
            }
        } catch (e) {
            console.error(`⚠️ Lỗi khi quét r/${sub}: ${e.message}`);
        }
    }
    
    throw new Error("❌ Không tìm được truyện nào mới! Hãy thử thêm subreddit hoặc đợi tuần sau.");
}

// Hàm chia nhỏ văn bản để Google TTS đọc được (Google giới hạn 200 ký tự)
function splitText(text) {
    return text.match(/[^.?!]+[.?!]+["']?|[^.?!]+$/g) || [text];
}

async function main() {
    try {
        console.log("=== START GENERATOR (ANTI-DUPLICATE) ===");
        
        // 1. LẤY TRUYỆN
        const story = await getRedditStory();

        // 2. DỊCH SANG TIẾNG VIỆT
        console.log("📝 Đang dịch sang tiếng Việt...");
        const translatedTitle = await translate(story.title, { to: 'vi' });
        const translatedText = await translate(story.text, { to: 'vi' });
        
        const cleanTitle = translatedTitle.text;
        const cleanText = translatedText.text.replace(/[*_#]/g, ''); // Xóa ký tự rác Markdown

        // 3. TẠO AUDIO
        console.log("🔊 Đang tạo Audio (TTS)...");
        const sentences = splitText(cleanText);
        let audioUrls = [];
        let captions = [];
        let currentTime = 0;

        // Xử lý từng câu
        // Lưu ý: Để đơn giản và nhanh, ta dùng Google TTS API (miễn phí)
        // Cách hoạt động: Tạo 1 file mp3 dài bằng cách nối các đoạn base64 lại là phức tạp.
        // Ở đây ta dùng cách đơn giản nhất: Lấy URL trực tiếp của Google TTS.
        
        // *Tuy nhiên, Remotion cần 1 file Audio duy nhất.*
        // Để code đơn giản nhất cho bạn mà không cần FFMPEG nối file audio phức tạp:
        // Ta sẽ dùng URL của một đoạn dài nhất hoặc tiêu đề làm mẫu.
        // NHƯNG ĐỂ CHUYÊN NGHIỆP: Tôi sẽ lưu text vào data.json, 
        // còn file audio tôi sẽ dùng thư viện google-tts-api để tải về file mp3.

        // --- CÁCH ĐƠN GIẢN HÓA CHO BẠN ---
        // Do giới hạn của script "free", việc nối audio rất phức tạp.
        // Tôi sẽ dùng giải pháp: Lấy 1 đoạn Audio dài khoảng 3-5 phút từ kho có sẵn
        // Hoặc tải file TTS về máy.
        
        // ==> SỬ DỤNG GIẢI PHÁP TẢI FILE MP3 VỀ (Cần đảm bảo thư mục public tồn tại)
        const publicDir = path.resolve('public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
        
        const audioPath = path.join(publicDir, 'voice.mp3');
        
        // Tải audio (Sử dụng hàm getAllAudioBase64 của google-tts-api)
        // Lưu ý: Đây là phần nặng nhất. Nếu text dài quá, Google sẽ chặn.
        // Ta sẽ lấy khoảng 10 câu đầu tiên (~1-2 phút) để demo cho an toàn.
        const shortText = sentences.slice(0, 15).join(' '); 
        
        const audioBase64 = await googleTTS.getAllAudioBase64(shortText, {
            lang: 'vi',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        });

        // Ghép các đoạn base64 lại thành 1 file mp3
        const buffer = Buffer.concat(audioBase64.map(item => Buffer.from(item.base64, 'base64')));
        fs.writeFileSync(audioPath, buffer);
        console.log("   -> Đã lưu file: public/voice.mp3");

        // 4. TẠO CAPTIONS (Ước lượng thời gian)
        // Vì ta không có timestamp chính xác từng từ từ Google TTS, ta sẽ ước lượng:
        // Trung bình đọc 1 từ mất 0.3 giây.
        const words = shortText.split(/\s+/);
        let timeCursor = 0;
        
        captions = words.map(word => {
            const duration = 300; // 300ms mỗi từ
            const start = timeCursor;
            const end = start + duration;
            timeCursor = end;
            
            return {
                text: word,
                startMs: start,
                endMs: end
            };
        });

        // 5. CHỌN BACKGROUND NGẪU NHIÊN
        const bgFiles = fs.readdirSync(publicDir).filter(f => f.startsWith('bg') && f.endsWith('.mp4'));
        const randomBg = bgFiles.length > 0 ? bgFiles[Math.floor(Math.random() * bgFiles.length)] : 'bg1.mp4';
        console.log(`🎬 Video nền: ${randomBg}`);

        // 6. XUẤT FILE DATA.JSON
        const finalData = {
            title: cleanTitle,
            audioUrl: 'voice.mp3', // File vừa tạo
            backgroundUrl: randomBg,
            captions: captions,
            durationInSeconds: timeCursor / 1000 + 2 // Cộng thêm 2s cuối cho chắc
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
        console.log(`✅ XONG! Đã cập nhật ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("❌ LỖI:", error.message);
    }
}

main();