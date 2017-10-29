"use strict";
const Botkit = require("botkit")
const axios = require("axios")
const PORT = process.env.PORT || 3000

const express = require("express")
const app = express()

app.get('/', (req, res) => res.send("Star Wars slack integration via chat bot!"))
// app.post('/', (req, res) => {
//     console.log(`POST: Star Wars slack integration via chat bot!: ${req.body}`)
//     res.send("POST: Star Wars slack integration via chat bot!")
// })

const controller = Botkit.slackbot({
  debug: true
})

// connect the bot to a stream of messages
const bot = controller.spawn({
  token: "xoxb-263664782004-uHjOsgyd8XE82cZig42MZPGv"
})

bot.startRTM();
bot.configureIncomingWebhook({
  url:
    "https://hooks.slack.com/services/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"
})

const getResponse = ({ id, bot, message }) => {
  axios
    .get(`https://swapi.co/api/people/${id || ""}`)
    .then(d => d.data)
    .then(d => {
      if (id) {
        return bot.reply(message, {
          text: `name: ${d.name} \n mass: ${d.mass} \n height: ${d.height} \n`
        });
      } else {
        const list = d.results.map(o => `${o.name} \n`).join("");
        bot.reply(message, {
          attachments: [
            {
              fallback: "Required plain-text summary of the attachment.",
              color: "#36a64f",
            //   pretext: "",
              title: "Here is a list of available star wars heroes",
              title_link: "https://swapi.co/",
              text: list,
            //   fields: [
            //     {
            //       title: "Priority",
            //       value: "High",
            //       short: false
            //     }
            //   ],
            //   image_url: "http://my-website.com/path/to/image.jpg",
            //   thumb_url: "http://example.com/path/to/thumb.png",
              footer: "Star wars API",
              footer_icon:
                "http://rm-content.s3.amazonaws.com/56c2d56262fc01cd5bc7d6e8/upload-646efee0-e3f4-11e6-a41f-f1fe9e9fd4a4_256.png",
              ts: Date.now()
            }
          ]
        });
      }
    })
    .catch(error =>
      bot.reply(message, `Something goes wrong. ${JSOn.stringify(error)}`)
    );
}

controller.hears(
  ["Show info for (.*)", "Show list", "list"],
  ["direct_message", "direct_mention", "mention"],
  (bot, message) => {
    getResponse({
      id: message.match[1],
      bot,
      message
    });
    return bot.reply(message, "Searching ...");
  }
)

controller.on("slash_command", (bot, message) => {
  switch (message.command) {
    case "/herolist":
      getResponse({ bot, message });
      break;
    default:
      bot.replyPrivate(message, "Sorry, I'm not sure what that command is");
  }
})

controller.setupWebserver(PORT, (err, app) => {
    if(err) console.error(`Something goes wrong: ${err}`)
    console.log(`App is running on port: ${PORT}`)

    controller.createWebhookEndpoints(app)
})
