"use strict";
var Botkit = require("botkit");
var axios = require("axios");
// var google = require('google');

var controller = Botkit.slackbot({
  debug: false
});

// connect the bot to a stream of messages
controller
  .spawn({
    token: "xoxb-263664782004-uHjOsgyd8XE82cZig42MZPGv"
  })
  .startRTM();

controller.hears(
  ["Show info for (.*)", "Show list", "list"],
  ["direct_message", "direct_mention", "mention"],
  (bot, message) => {
    const id = message.match[1];
    axios
      .get(`https://swapi.co/api/people/${id || ""}`)
      .then(d => d.data)
      .then(d => {
        if (id) {
          return bot.reply(message, {
            text: `
                      name: ${d.name}
                      mass: ${d.mass}
                      height: ${d.height}
                  `
          });
        } else {
          bot.reply(message, {
            attachments: [
              {
                fallback: "Required plain-text summary of the attachment.",
                color: "#36a64f",
                pretext: "Here is a list of available star wars heroes",
                title: "Slack API Documentation",
                title_link: "https://api.slack.com/",
                text: "Optional text that appears within the attachment",
                fields: [
                  {
                    title: "Priority",
                    value: "High",
                    short: false
                  }
                ],
                image_url: "http://my-website.com/path/to/image.jpg",
                thumb_url: "http://example.com/path/to/thumb.png",
                footer: "Slack API",
                footer_icon:
                  "https://platform.slack-edge.com/img/default_application_icon.png",
                ts: 123456789
              }
            ]
          });
        }
      })
      .catch(function(error) {
        console.log(error);
      });

    return bot.reply(message, "Searching ...");
  }
);
