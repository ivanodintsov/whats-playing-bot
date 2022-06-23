import {
  InteractionType,
  ComponentType,
  ApplicationCommandType,
} from 'discord-api-types/v10';

import {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
  SelectMenuInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js-light/node_modules/discord.js/src';

import * as Action from 'discord.js-light/node_modules/discord.js/src/client/actions/Action';

export class CreateInteraction extends Action {
  handle(data) {
    // @ts-ignore
    const client = this.client;

    // Resolve and cache partial channels for Interaction#channel getter
    // @ts-ignore
    const channel = this.getChannel(data);

    // Do not emit this for interactions that cache messages that are non-text-based.
    let InteractionClass;

    switch (data.type) {
      case InteractionType.ApplicationCommand:
        switch (data.data.type) {
          case ApplicationCommandType.ChatInput:
            InteractionClass = ChatInputCommandInteraction;
            break;
          case ApplicationCommandType.User:
            InteractionClass = UserContextMenuCommandInteraction;
            break;
          case ApplicationCommandType.Message:
            if (channel && !channel.isTextBased()) return;
            InteractionClass = MessageContextMenuCommandInteraction;
            break;
          default:
            console.log(
              `[INTERACTION] Received application command interaction with unknown type: ${data.data.type}`,
            );
            return;
        }
        break;
      case InteractionType.MessageComponent:
        if (channel && !channel.isTextBased()) return;

        switch (data.data.component_type) {
          case ComponentType.Button:
            InteractionClass = ButtonInteraction;
            break;
          case ComponentType.SelectMenu:
            InteractionClass = SelectMenuInteraction;
            break;
          default:
            console.log(
              `[INTERACTION] Received component interaction with unknown type: ${data.data.component_type}`,
            );
            return;
        }
        break;
      case InteractionType.ApplicationCommandAutocomplete:
        InteractionClass = AutocompleteInteraction;
        break;
      case InteractionType.ModalSubmit:
        InteractionClass = ModalSubmitInteraction;
        break;
      default:
        console.log(
          `[INTERACTION] Received interaction with unknown type: ${data.type}`,
        );
        return;
    }

    const interaction = new InteractionClass(client, data);

    return interaction;
  }
}
