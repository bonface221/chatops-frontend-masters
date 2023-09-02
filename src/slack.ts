import type { Handler } from "@netlify/functions";
import { parse } from "querystring";
import { blocks, modal, SlackApi, verifySlackRequest } from "./util/slack";
import { saveItem } from "./util/notion";

async function handleSlashCommand(payload: SlackSlashCommandPayload) {
  switch (payload.command) {
    case "/foodfight":
      const response = await SlackApi(
        "views.open",
        modal({
          id: "foodfight_modal",
          title: "Start a food fight",
          trigger_id: payload.trigger_id,
          blocks: [
            blocks.section({
              text: "The discuss demands food drama! *send in your spiciest food takes so we can all argue about them and feel alive. *",
            }),
            blocks.input({
              id: "opinion",
              label: "Deposit your controversial food opinion here",
              placeholder: "Example: peanut butter is the best condiment",
              initial_value: payload.text ?? "",
              hint: "What do you believe about food that people find appalling? say it with your chest",
            }),
            blocks.select({
              id: "spice_level",
              label: "How spicy is this opinion?",
              placeholder: "Select a spice level",
              options: [
                { label: "mild", value: "mild" },
                { label: "medium", value: "medium" },
                { label: "spicy", value: "spicy" },
                { label: "nuclear", value: "nuclear" },
              ],
            }),
          ],
        })
      );

      if (!response.ok) {
        console.log(response);
      }
      break;
    default:
      return {
        statusCode: 200,
        body: `Command ${payload.command} not recognized.`,
      };
  }

  return {
    statusCode: 200,
    body: "",
  };
}

async function handleInteractivity(payload: SlackModalPayload) {
  const callback_id = payload.callback_id ?? payload.view.callback_id;

  switch (callback_id) {
    case "foodfight_modal":
      const data = payload.view.state.values;

      const fields = {
        opinion: data.opinion_block.opinion.value,
        spiceLevel: data.spice_level_block.spice_level.selected_option.value,
        submitter: payload.user.name,
      };

      await saveItem(fields);

      await SlackApi("chat.postMessage", {
        channel: "C05QN9UJPN0",
        text: `Oh dang, y'all! :eyes: <@${payload.user.id}> just started a food fight with a ${fields.spiceLevel} take: \n\n*${fields.opinion}*\n\n ....discusss.`,
      });
      break;

    default:
      console.log(`No handler defined for ${callback_id}`);
      return {
        statusCode: 400,
        body: `No handler defined for ${callback_id}`,
      };
  }

  return {
    statusCode: 200,
    body: "",
  };
}
export const handler: Handler = async (event) => {
  const valid = verifySlackRequest(event);

  if (!valid) {
    console.error("Invalid request");

    return {
      statusCode: 401,
      body: "Invalid request",
    };
  }
  // TODO validate the Slack request
  const body = parse(event.body ?? "") as SlackPayload;

  // TODO handle slash commands

  if (body.command) {
    return handleSlashCommand(body as SlackSlashCommandPayload);
  }

  // TODO handle interactivity (e.g. context commands, modals)
  if (body.payload) {
    const paylod = JSON.parse(body.payload);
    return handleInteractivity(paylod);
  }

  return {
    statusCode: 200,
    body: "TODO: handle Slack commands and interactivity",
  };
};
