import { select, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { runAgentMode } from "./agents/orchestrator";

export const runCLIMode = async () => {
  while (true) {
    const mode = await select({
      message: "Which sub-mode do you want to proceed in CLI mode?",
      options: [
        { value: "Agent", label: "Agent", hint: "Run omnidev in Agent mode" },
        {
          value: "Plan",
          label: "Plan",
          hint: "Run omnidev in Plan mode",
        },
        {
          value: "Ask",
          label: "Ask",
          hint: "Run omnidev in Ask mode",
        },
        {
          value: "Back",
          label: "Back",
          hint: "Back to main menu",
        },
      ],
    });

    if (isCancel(mode) || mode === "Back") {
      return;
    }

    if (mode === "Agent") {
      await runAgentMode();
    }
    if (mode === "Plan") {
      console.log(chalk.dim("Plan mode is running...."));
    }
    if (mode === "Ask") {
      console.log(chalk.dim("Ask mode is running...."));
    }
    if (mode !== "Agent" && mode !== "Plan" && mode !== "Ask") {
      console.log(chalk.yellow("\nThis mode is not supported yet.\n"));
    }
  }
};
