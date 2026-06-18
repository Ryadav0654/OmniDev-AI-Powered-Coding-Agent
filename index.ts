#!/usr/bin/env bun

import { Command } from "commander";
import { wakeup } from "./tui/wakeup";

const program = new Command();

// Set up the command line interface
program.name("omnidev").description("Omnidev CLI tool").version("0.0.1");

// Define the "wakeup" command
program
  .command("wakeup")
  .description("Wakes up omnidev")
  .action(async () => {
    await wakeup();
  });

await program.parseAsync(process.argv);
