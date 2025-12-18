import {createCanvas} from 'canvas';

export const createImageFile = () => {
  // Create canvas
  const canvas = createCanvas(400, 300);
  const canvasCtx = canvas.getContext('2d');

  // Draw something on the canvas
  canvasCtx.fillStyle = 'blue';
  canvasCtx.fillRect(0, 0, 400, 300);
  canvasCtx.fillStyle = 'white';
  canvasCtx.font = '30px Arial';
  canvasCtx.fillText('Hello XMTP!', 100, 150);

  // Create a File object
  const buffer = canvas.toBuffer('image/png');
  return new File([new Uint8Array(buffer)], 'hello-xmtp.png', {
    type: 'image/png',
  });
};
