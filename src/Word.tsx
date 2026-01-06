import React from 'react';

export const Word = ({ text, active }: { text: string; active: boolean }) => {
	const scale = active ? 1.3 : 1;
	const color = active ? '#FFD700' : 'white';
	return (
		<span
			style={{
				display: 'inline-block', marginRight: '10px',
				fontSize: '70px', fontFamily: 'Arial, sans-serif', fontWeight: '900',
				color, textTransform: 'uppercase',
                textShadow: '3px 3px 0px #000',
				transform: `scale(${scale})`,
				transition: 'transform 0.1s ease-in-out',
			}}
		>
			{text}
		</span>
	);
};