"use strict";
require("dotenv").config();
const Botkit = require("botkit");
const axios = require("axios");
const PORT = process.env.PORT || 4000;

// const express = require("express");
// const app = express();

const controller = Botkit.slackbot({
  debug: false
});

// connect the bot to a stream of messages
const bot = controller.spawn({
  token: "xoxb-263664782004-uHjOsgyd8XE82cZig42MZPGv"
});

bot.startRTM();
bot.configureIncomingWebhook({
  url:
    "https://hooks.slack.com/services/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"
});

const getAuthToken = () =>
  axios
    .post(`${process.env.HOST}/ext/rest/api/smc/session`, {
      User: process.env.USER_NAME,
      Pass: process.env.USER_PASS
    })
    .then(d => d.data.EagleSessionID);

const getServices = id =>
  axios
    .get(`${process.env.HOST}/ext/rest/api/smc/services${id ? "/" + id : ""}`)
    .then(d => d.data)
    .then(d => {
      return (id ? [d] : d).map(o => ({
        name: o.Name,
        id: o.Id,
        status: o.StatusMsg
      }));
    });

const setServiceStatus = (id, State) =>
  axios
    .put(`${process.env.HOST}/ext/rest/api/smc/services/${id}/status`, {
      State
    })
    .then(d => d.data);

const retryStatuses = [401, 403];
axios.interceptors.response.use(
  config => config, // success handler
  error => {
    // error handler
    let originalRequest = error.config;
    if (
      retryStatuses.indexOf(error.response.status) > -1 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      return getAuthToken().then(EagleSessionID => {
        axios.defaults.headers.common["EagleSessionID"] = EagleSessionID;
        originalRequest._retry = true;
        return axios(originalRequest);
      });
    }
    return Promise.reject(error);
  }
);

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
};

const botErrorHandler = (e, bot, message) =>
  bot.reply(message, `Error: ${e.message}`);

controller.hears(
  ["Show (.*) services", "services", "list", "sbs:(.*)"],
  ["direct_message", "direct_mention", "mention"],
  (bot, message) => {
    const status = message.match[1];
    getServices()
      .then(d => {
        const isStatusMatch = o =>
          status ? o.status.toLowerCase() === status.toLowerCase() : true;
        const formatService = o => `${o.name} : ${o.id} : ${o.status}  \n`;
        const servicesArr = d.filter(isStatusMatch).map(formatService);
        const responseText = servicesArr.length
          ? servicesArr.join("")
          : "There are no services found";

        bot.reply(message, {
          attachments: [
            {
              fallback: "Here should be list of available services",
              color: "#36a64f",
              title: "Available services",
              // title_link: "https://swapi.co/",
              text: responseText,
              footer: "Eagle API",
              footer_icon:
                "http://rm-content.s3.amazonaws.com/56c2d56262fc01cd5bc7d6e8/upload-646efee0-e3f4-11e6-a41f-f1fe9e9fd4a4_256.png",
              ts: Date.now()
            }
          ]
        });
      })
      .catch(e => botErrorHandler(e, bot, message));

    return bot.reply(message, "Processing...");
  }
);

controller.hears(
  ["Show service status by id (.*)", "serviceById: (.*)", "sbid:(.*)"],
  ["direct_message", "direct_mention", "mention"],
  (bot, message) => {
    const serviceId = message.match[1];
    getServices(serviceId)
      .then(d => {
        const formatService = o => `${o.name} : ${o.id} : ${o.status}  \n`;
        const servicesArr = d.map(formatService);
        const responseText = servicesArr.length
          ? servicesArr.join("")
          : "There are no service with provided ID";

        bot.reply(message, {
          attachments: [
            {
              fallback: `Here is an info for service with id: ${serviceId}`,
              color: "#2879fc",
              title: `Service with id: ${serviceId}`,
              // title_link: "https://swapi.co/",
              text: responseText,
              footer: "Eagle API",
              footer_icon:
                "http://rm-content.s3.amazonaws.com/56c2d56262fc01cd5bc7d6e8/upload-646efee0-e3f4-11e6-a41f-f1fe9e9fd4a4_256.png",
              ts: Date.now()
            }
          ]
        });
      })
      .catch(e => botErrorHandler(e, bot, message));

    return bot.reply(message, "Processing...");
  }
);

const supportedServiceStatuses = ["Up", "Down", "PendingRestart"];
controller.hears(
  ["Set service:(.*) status to (.*)", "ss:(.*)st:(.*)"],
  ["direct_message", "direct_mention", "mention"],
  (bot, message) => {
    const serviceId = message.match[1];
    const serviceStatus = message.match[2];

    if (supportedServiceStatuses.indexOf(serviceStatus) < 0)
      return bot.reply(
        message,
        `${serviceStatus} is not supported for service`
      );

    if (!serviceId) return bot.reply(message, "Please provide serviceId");

    setServiceStatus(serviceId, serviceStatus)
      .then(d => {
        const text = d.Details || "Something goes wrong";

        bot.reply(message, {
          attachments: [
            {
              fallback: `Here is an info for service with id: ${serviceId}`,
              color: "#36a64f",
              title: `Setting status:${serviceStatus} for service with id: ${serviceId}`,
              text,
              footer: "Eagle API",
              footer_icon:
                "http://rm-content.s3.amazonaws.com/56c2d56262fc01cd5bc7d6e8/upload-646efee0-e3f4-11e6-a41f-f1fe9e9fd4a4_256.png",
              ts: Date.now()
            }
          ]
        });
      })
      .catch(e => botErrorHandler(e, bot, message));

    return bot.reply(message, "Processing...");
  }
);

// controller.hears(
//   ["Show info for (.*)", "Show services", "services"],
//   ["direct_message", "direct_mention", "mention"],
//   (bot, message) => {
//     getResponse({
//       id: message.match[1],
//       bot,
//       message
//     });
//     return bot.reply(message, "Searching ...");
//   }
// )

// controller.on("slash_command", (bot, message) => {
//   switch (message.command) {
//     case "/herolist":
//       getResponse({ bot, message });
//       break;
//     default:
//       bot.replyPrivate(message, "Sorry, I'm not sure what that command is");
//   }
// })

// controller.setupWebserver(PORT, (err, app) => {
//     if(err) console.error(`Something goes wrong: ${err}`)
//     console.log(`App is running on port: ${PORT}`)

//     controller.createWebhookEndpoints(app)
// })
