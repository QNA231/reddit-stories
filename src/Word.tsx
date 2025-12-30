import React from 'react';
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

export const Word = ({ text, active }: { text: string; active: boolean }) => {
	const scale = active ? 1.3 : 1;
	const color = active ? '#FFD700' : 'white';
	return (
		<span
			style={{
				display: 'inline-block', marginRight: '10px',
				fontSize: '70px', fontFamily, fontWeight: '900',
				color, textTransform: 'uppercase',
                textShadow: '4px 4px 0px rgba(0,0,0,0.8)',
				transform: `scale(${scale})`,
				transition: 'transform 0.1s ease-in-out',
			}}
		>
			{text}
		</span>
	);
};