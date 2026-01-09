import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Watermark } from './Watermark';

interface Caption {
    text: string;
    startMs: number;
    endMs: number;
}

interface SubtitlePhrase {
    text: string;
    startFrame: number;
    endFrame: number;
}

interface RedditStoryProps {
    data: {
        audioUrl: string;
        captions: Caption[];
        backgroundUrl?: string; 
    };
}

export const RedditStory: React.FC<RedditStoryProps> = ({ data }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const subtitlePhrases = useMemo(() => {
        const phrases: SubtitlePhrase[] = []; 
        let currentPhrase: Caption[] = [];
        const MAX_WORDS_PER_SCREEN = 12; 

        data.captions.forEach((word, index) => {
            currentPhrase.push(word);
            const hasPunctuation = /[.?!,;]/.test(word.text);
            const isTooLong = currentPhrase.length >= MAX_WORDS_PER_SCREEN;
            const isLastWord = index === data.captions.length - 1;

            if (hasPunctuation || isTooLong || isLastWord) {
                const startMs = currentPhrase[0].startMs;
                const endMs = currentPhrase[currentPhrase.length - 1].endMs;
                
                phrases.push({
                    text: currentPhrase.map(w => w.text).join(' '),
                    startFrame: (startMs / 1000) * fps,
                    endFrame: (endMs / 1000) * fps
                });
                currentPhrase = [];
            }
        });
        return phrases;
    }, [data.captions, fps]);

    const currentSubtitle = subtitlePhrases.find(phrase => {
        return frame >= phrase.startFrame - 5 && frame <= phrase.endFrame + 5;
    });

    return (
        <AbsoluteFill style={{ backgroundColor: '#00FF00' }}> 
            
            <Audio src={staticFile(data.audioUrl)} />

            {/* Watermark giữ nguyên */}
            <Watermark text="@KenhRedditCuaBan" />

            {/* PHẦN HIỂN THỊ CHỮ CHÍNH */}
            <AbsoluteFill style={{ zIndex: 20 }}>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', 
                    
                    // --- 1. CĂN CHỈNH VỊ TRÍ ---
                    justifyContent: 'center', // Căn giữa theo chiều ngang
                    alignItems: 'flex-end',   // Đẩy xuống phía dưới cùng (Thay vì 'center')
                    
                    // --- 2. KHOẢNG CÁCH AN TOÀN ---
                    // paddingBottom: 350px là khoảng cách vàng cho TikTok/Shorts
                    // (Tránh bị tiêu đề video và tên kênh che mất chữ)
                    paddingBottom: '350px',   
                    paddingLeft: '40px',      // Cách lề trái phải một chút
                    paddingRight: '40px',
                    
                    textAlign: 'center'
                }}>
                    <h1 style={{
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '55px',
                        color: 'white',
                        textShadow: '3px 3px 0px black', 
                        lineHeight: 1.4, // Giãn dòng nhẹ cho dễ đọc
                        maxWidth: '100%',
                        wordBreak: 'keep-all',
                        margin: 0 // Xóa margin thừa
                    }}>
                        {currentSubtitle ? currentSubtitle.text : ""}
                    </h1>
                </div>
            </AbsoluteFill>
            
        </AbsoluteFill>
    );
};