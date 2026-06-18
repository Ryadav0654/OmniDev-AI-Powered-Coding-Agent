import { isCancel, text } from "@clack/prompts";
import chalk from "chalk";
import { defaultAgentConfig } from "./types";
import { ActionTracker } from "./action-tracker";
import { ToolExecutor } from "./tool-executor";

export const runAgentMode = async () => {
  console.log(chalk.bold("\nAgent mode is running..."));
  const goal = await text({
    message: "What would you like the agent to do?",
    placeholder: "Concrete task for this codebase",
  });

  if (isCancel(goal) || goal.trim().length === 0) {
    return;
  }

  const config = defaultAgentConfig();
  const tracker = new ActionTracker();
  const executor = new ToolExecutor(config, tracker);
};
