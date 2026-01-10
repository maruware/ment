import { ActionIcon, Box, Center } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlayerStopFilled, IconScreenShare } from "@tabler/icons-react";
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
		} catch {
			notifications.show({
				title: "エラー",
				message: "画面共有へのアクセスに失敗しました",
				color: "red",
			});
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
		<Box w="100vw" h="100vh">
			{!stream && (
				<Center h="100vh">
					<ActionIcon
						size={72}
						variant="filled"
						color="lime"
						onClick={startScreenShare}
						aria-label="Start screen share"
					>
						<IconScreenShare size={48} />
					</ActionIcon>
				</Center>
			)}
			{stream && (
				<Box pos="relative" w="100vw" h="100vh" style={{ overflow: "hidden" }}>
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
					<ActionIcon
						pos="absolute"
						top={20}
						right={20}
						size="lg"
						variant="filled"
						color="red"
						onClick={stopScreenShare}
						aria-label="Stop screen share"
					>
						<IconPlayerStopFilled />
					</ActionIcon>
				</Box>
			)}
		</Box>
	);
}
