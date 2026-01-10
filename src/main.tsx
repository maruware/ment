import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { render } from "preact";
import { App } from "./app.tsx";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

render(
	<MantineProvider defaultColorScheme="dark">
		<Notifications />
		<App />
	</MantineProvider>,
	// biome-ignore lint/style/noNonNullAssertion: app element is guaranteed to exist
	document.getElementById("app")!,
);
