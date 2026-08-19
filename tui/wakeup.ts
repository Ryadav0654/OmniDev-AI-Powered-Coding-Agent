import figlet from "figlet";
import { select, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { runCLIMode } from "../modes/cli";
import { runTelegramMode } from "../modes/telegram";

const BANNER_FONT = "ANSI Shadow";
const SHADOW = chalk.hex("#5b4d9e");
const FACE = chalk.hex("#e8dcf8").bold;

function printBannerWithShaddow(ascii: string) {
  const bannerLines = ascii.replace(/\s+$/, "").split("\n");
  const maxLen = Math.max(...bannerLines.map((l) => l.length), 0);
  const rowWidth = maxLen + 2;

  for (const line of bannerLines) {
    console.log(SHADOW(("  " + line).padEnd(rowWidth)));
  }
  process.stdout.write(`\x1b[${bannerLines.length}A`);
  for (const line of bannerLines) {
    console.log(FACE(line.padEnd(rowWidth)));
  }
  console.log();
}
export const wakeup = async () => {
  let ascii: string;
  try {
    ascii = figlet.textSync("Omnidev", { font: BANNER_FONT });
  } catch (error) {
    ascii = figlet.textSync("Omnidev", { font: "Standard" });
  }
  printBannerWithShaddow(ascii);

  const mode = await select({
    message: "Which mode do you want to proceed with?",
    options: [
      { value: "CLI", label: "CLI", hint: "Run omnidev in CLI mode" },
      {
        value: "Telegram",
        label: "Telegram",
        hint: "Run omnidev in Telegram mode",
      },
      {
        value: "Exit",
        label: "Exit",
        hint: "Exit omnidev",
      },
    ],
    maxItems: 2,
  });

  if (isCancel(mode) || mode === "Exit") {
    console.log(chalk.dim("Goodbye!"));
    process.exit(0);
  }

  if (mode === "CLI") {
    console.log(chalk.dim("Starting CLI mode..."));
    await runCLIMode();
  } else if (mode === "Telegram") {
    console.log(chalk.dim("Starting Telegram mode..."));
    runTelegramMode();
  }
};
