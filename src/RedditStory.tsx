import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Watermark } from './Watermark';

// 1. Định nghĩa kiểu dữ liệu gốc (từ file json)
interface Caption {
    text: string;
    startMs: number;
    endMs: number;
}

// 2. Định nghĩa kiểu dữ liệu cho Cụm từ sau khi gom nhóm (Fix lỗi phrases)
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
        // --- FIX LỖI Ở ĐÂY: Khai báo rõ kiểu mảng là SubtitlePhrase[] ---
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

    // Tìm cụm từ đang nói
    const currentSubtitle = subtitlePhrases.find(phrase => {
        return frame >= phrase.startFrame - 5 && frame <= phrase.endFrame + 5;
    });

    return (
        <AbsoluteFill style={{ backgroundColor: '#00FF00' }}> 
            
            <Audio src={staticFile(data.audioUrl)} />
            <Watermark text="@RedditStories" />
            <AbsoluteFill>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '60px',
                    textAlign: 'center'
                }}>
                    <h1 style={{
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '55px',
                        color: 'white',
                        textShadow: '3px 3px 0px black', 
                        lineHeight: 1.5,
                        maxWidth: '90%',
                        wordBreak: 'keep-all'
                    }}>
                        {currentSubtitle ? currentSubtitle.text : ""}
                    </h1>
                </div>
            </AbsoluteFill>
            
        </AbsoluteFill>
    );
};