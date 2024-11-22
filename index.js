const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");
const snoowrap = require("snoowrap");
require('dotenv').config()

// Your reddit application
const reddit = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

async function fetchVideos(subredditName) {
  try {
    const subreddit = await reddit.getSubreddit(subredditName);
    const posts = await subreddit.getHot({ limit: 20 });
    let videosList = [];

    posts.forEach((post) => {
      if (post.is_video) {
        videosList.push(post.url);
      }
    });

    return videosList;
  } catch (error) {
    console.error("Error fetching videos:", error);
  }
}

function chooseRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function createMessage() {
  const videos = await fetchVideos(process.env.REDDIT_PAGE);
  const randomVideo = chooseRandom(videos);
  return `${process.env.RECURRING_MESSAGE} ${randomVideo}`;
}

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("ready", () => {
  console.log("Client is ready!");

  // Send a recurrent message to someone
  cron.schedule(process.env.CRON_VALUE, async () => {
    const number = process.env.CELLPHONE_NUMBER;
    const message = await createMessage()

    client.getContacts().then((contacts) => {
      const contact = contacts.find((c) => c.number.includes(number));
      if (contact) {
        client
          .sendMessage(contact.id._serialized, message)
          .then((response) => console.log("Message sent:", response))
          .catch((error) => console.error("Error sending message:", error));
      } else {
        console.error("Contact not found");
      }
    });
  });
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.initialize();

// Auto-answer a specific message
client.on("message_create", (message) => {
  if (
    message.body ===
    process.env.AUTO_ANSWER_MESSAGE
  ) {
    client.sendMessage(
      message.from,
      process.env.AUTO_ANSWER_RESPONSE
    );
  }
});
