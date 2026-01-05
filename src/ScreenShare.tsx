import {
	IconPlayerPlayFilled,
	IconPlayerStopFilled,
} from "@tabler/icons-react";
import { useEffect, useState } from "preact/hooks";

function getScreen() {
	return navigator.mediaDevices.getDisplayMedia({ video: true });
}

function stopStream(stream: MediaStream) {
	for (const track of stream.getTracks()) {
		track.stop();
	}
}

export function ScreenShare() {
	const [stream, setStream] = useState<MediaStream | null>(null);

	const startScreenShare = async () => {
		try {
			const mediaStream = await getScreen();

			for (const track of mediaStream.getTracks()) {
				track.onended = () => {
					setStream(null);
				};
			}

			setStream(mediaStream);
		} catch (err) {
			console.error("Error accessing screen:", err);
		}
	};

	const stopScreenShare = () => {
		if (stream) {
			stopStream(stream);
			setStream(null);
		}
	};

	useEffect(() => {
		return () => {
			if (stream) {
				stopStream(stream);
			}
		};
	}, [stream]);

	return (
		<div style={{ width: "100vw", height: "100vh" }}>
			{!stream && (
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
					}}
				>
					<button type="button" onClick={startScreenShare}>
						<IconPlayerPlayFilled />
					</button>
				</div>
			)}
			{stream && (
				<div
					style={{
						position: "relative",
						width: "100vw",
						height: "100vh",
						overflow: "hidden",
					}}
				>
					<video
						srcObject={stream}
						autoPlay
						playsInline
						style={{
							width: "100%",
							height: "100%",
							objectFit: "contain",
							backgroundColor: "#000",
						}}
					></video>
					<button
						type="button"
						onClick={stopScreenShare}
						style={{
							position: "absolute",
							top: "20px",
							right: "20px",
						}}
					>
						<IconPlayerStopFilled />
					</button>
				</div>
			)}
		</div>
	);
}
