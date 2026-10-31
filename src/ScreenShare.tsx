import {
	ActionIcon,
	Box,
	Button,
	Center,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlayerStopFilled, IconScreenShare } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "preact/hooks";

type ShareMode = "inline" | "external";

type DisplayLike = {
	left: number;
	top: number;
	width: number;
	height: number;
	isPrimary: boolean;
};

type ScreenDetailsLike = {
	screens: DisplayLike[];
};

type DisplayWindowBounds = {
	left: number;
	top: number;
	width: number;
	height: number;
};

declare global {
	interface Window {
		getScreenDetails?: () => Promise<ScreenDetailsLike>;
	}
}

function getScreen() {
	return navigator.mediaDevices.getDisplayMedia({ video: true });
}

function stopStream(stream: MediaStream) {
	for (const track of stream.getTracks()) {
		track.stop();
	}
}

async function getExternalDisplayBounds() {
	if (!window.getScreenDetails) {
		return null;
	}

	try {
		const screenDetails = await window.getScreenDetails();
		const external = screenDetails.screens.find(
			(screenInfo) => !screenInfo.isPrimary,
		);

		if (!external) {
			return null;
		}

		return {
			left: external.left,
			top: external.top,
			width: external.width,
			height: external.height,
		};
	} catch {
		return null;
	}
}

function openViewerWindow(bounds: DisplayWindowBounds | null) {
	const fallbackWidth = 1280;
	const fallbackHeight = 720;
	const width = bounds?.width ?? fallbackWidth;
	const height = bounds?.height ?? fallbackHeight;
	const left =
		bounds?.left ??
		Math.max(Math.floor((window.screen.width - fallbackWidth) / 2), 0);
	const top =
		bounds?.top ??
		Math.max(Math.floor((window.screen.height - fallbackHeight) / 2), 0);

	return window.open(
		"",
		"ment-screen-viewer",
		`popup=yes,resizable=yes,width=${width},height=${height},left=${left},top=${top}`,
	);
}

async function setupViewerWindow(viewerWindow: Window, stream: MediaStream) {
	viewerWindow.document.title = "ment - Display";
	viewerWindow.document.body.style.margin = "0";
	viewerWindow.document.body.style.backgroundColor = "#000";
	viewerWindow.document.body.style.overflow = "hidden";

	const video = viewerWindow.document.createElement("video");
	video.autoplay = true;
	video.muted = true;
	video.playsInline = true;
	video.style.width = "100vw";
	video.style.height = "100vh";
	video.style.objectFit = "contain";
	video.style.backgroundColor = "#000";
	viewerWindow.document.body.replaceChildren(video);
	video.srcObject = stream;

	await new Promise<void>((resolve, reject) => {
		let settled = false;

		const onReady = async () => {
			if (settled) {
				return;
			}
			try {
				await video.play();
				settled = true;
				resolve();
			} catch (error) {
				settled = true;
				reject(error);
			}
		};

		video.addEventListener("loadedmetadata", onReady, { once: true });
		video.addEventListener("canplay", onReady, { once: true });

		window.setTimeout(() => {
			if (settled) {
				return;
			}
			settled = true;
			reject(new Error("Timed out while preparing external viewer"));
		}, 3000);
	});
}

export function ScreenShare() {
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [shareMode, setShareMode] = useState<ShareMode | null>(null);
	const viewerWindowRef = useRef<Window | null>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const closeViewerWindow = () => {
		if (viewerWindowRef.current && !viewerWindowRef.current.closed) {
			viewerWindowRef.current.close();
		}
		viewerWindowRef.current = null;
	};

	const attachStopHandler = (mediaStream: MediaStream, mode: ShareMode) => {
		for (const track of mediaStream.getTracks()) {
			track.onended = () => {
				if (mode === "external") {
					closeViewerWindow();
				}
				setShareMode(null);
				setStream(null);
			};
		}
	};

	const startInlineShare = async () => {
		try {
			const mediaStream = await getScreen();
			attachStopHandler(mediaStream, "inline");
			setShareMode("inline");
			setStream(mediaStream);
		} catch {
			notifications.show({
				title: "エラー",
				message: "画面共有へのアクセスに失敗しました",
				color: "red",
			});
		}
	};

	const startExternalShare = async () => {
		try {
			const mediaStream = await getScreen();
			const displayBounds = await getExternalDisplayBounds();
			const viewerWindow = openViewerWindow(displayBounds);

			if (!viewerWindow) {
				stopStream(mediaStream);
				notifications.show({
					title: "エラー",
					message:
						"表示ウィンドウを開けませんでした。ポップアップを許可してください",
					color: "red",
				});
				return;
			}

			viewerWindowRef.current = viewerWindow;
			try {
				await setupViewerWindow(viewerWindow, mediaStream);
			} catch {
				stopStream(mediaStream);
				closeViewerWindow();
				notifications.show({
					title: "エラー",
					message: "表示ウィンドウで映像を再生できませんでした",
					color: "red",
				});
				return;
			}

			if (!displayBounds) {
				notifications.show({
					title: "表示ウィンドウを開きました",
					message: "必要に応じて外部ディスプレイへ移動してください",
					color: "blue",
				});
			}

			viewerWindow.addEventListener("beforeunload", () => {
				setStream((currentStream) => {
					if (currentStream) {
						stopStream(currentStream);
					}
					setShareMode(null);
					return null;
				});
				viewerWindowRef.current = null;
			});

			attachStopHandler(mediaStream, "external");
			setShareMode("external");
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
			if (shareMode === "external") {
				closeViewerWindow();
			}
			setShareMode(null);
			setStream(null);
		}
	};

	useEffect(() => {
		streamRef.current = stream;
	}, [stream]);

	useEffect(() => {
		return () => {
			if (streamRef.current) {
				stopStream(streamRef.current);
			}
			closeViewerWindow();
		};
	}, []);

	return (
		<Box w="100vw" h="100vh">
			{!stream && (
				<Center h="100vh">
					<Stack gap="lg" align="center">
						<Title order={2}>画面共有</Title>
						<Text c="dimmed" ta="center">
							通常開始と、外部ディスプレイ向けの表示専用モードを選べます。
						</Text>
						<Group>
							<Button
								leftSection={<IconScreenShare size={18} />}
								variant="light"
								onClick={startInlineShare}
							>
								通常開始
							</Button>
							<Button
								leftSection={<IconScreenShare size={18} />}
								color="lime"
								onClick={startExternalShare}
							>
								外部表示モードで開始
							</Button>
						</Group>
					</Stack>
				</Center>
			)}
			{stream && shareMode === "inline" && (
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
			{stream && shareMode === "external" && (
				<Box pos="relative" w="100vw" h="100vh">
					<Center h="100vh">
						<Stack gap="md" align="center">
							<Title order={2}>共有中</Title>
							<Text c="dimmed" ta="center">
								表示は別ウィンドウで行っています。停止はこの画面で行ってください。
							</Text>
							<Button
								leftSection={<IconPlayerStopFilled size={18} />}
								color="red"
								onClick={stopScreenShare}
							>
								共有を停止
							</Button>
						</Stack>
					</Center>
				</Box>
			)}
		</Box>
	);
}
