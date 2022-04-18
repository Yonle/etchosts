require("dotenv").config();
const grammy = require("grammy");
const resolver = require("dns").promises;

// The telegram bot
const bot = new grammy.Bot(process.env.BOT_TOKEN);

// User Sessions, Used for /generate command in group.
const sess = new Map();

// When required
resolver.setServers(["1.1.1.1"]);

async function generate(hostnames) {
  let hosts = {};
  let text = [];

  for (i in hostnames) {
    // Grab the Hostname, even in URL.
    host = /(?:https?:\/\/)?([\w\d\.\-]+)/.exec(hostnames[i].toLowerCase())[1];

    // Ignore onion address sinceit's unsupported here
    if (host.endsWith(".onion"))
      return ctx.reply(
        `\`[i] I skipped ${host} because i'm not supporting .onion domain yet.\``,
        { parse_mode: "MarkdownV2" }
      );

    // Skip existing hostname
    if (hosts[host]) continue;

    // Look up IP address of {host} string.
    // Returns Array with bunch of IP address of single hostname
    hosts[host] = (await resolver.lookup(host, { all: true })).map(
      (ip) => ip.address
    );
  }

  // Parse hosts
  for (host in hosts) {
    let ips = hosts[host];

    ips.forEach((ip) => {
      text.push(`${ip}\t${host}`);
    });
  }

  return text.join("\n");
}

// Handle /start command
bot.command("start", (ctx) =>
  ctx
    .reply(
      "<b>🙋‍♂️Hi! I'm Static DNS file generator!</b>\n" +
        "To generate a static DNS file, Send me a domains, Each splitted with space.",
      { reply_to_message_id: ctx.message.message_id, reply_markup: { force_reply: true, selective: true }, parse_mode: "HTML" }
    )
    .then(({ message_id }) => sess.set(ctx.message.from.id, message_id))
);

// Handle /generate command
bot.command("generate", (ctx) =>
  ctx
    .reply(
      "What hostnames would you like me to generate? " +
        "Each hostnames should be separated with space.",
      { reply_to_message_id: ctx.message.message_id, reply_markup: { force_reply: true, selective: true } }
    )
    .then(({ message_id }) => sess.set(ctx.message.from.id, message_id))
);

// Listen to text message event
bot.on("message:text", async (ctx) => {
  if (
    ctx.message.chat.type !== "private" &&
    ctx.message.reply_to_message &&
    sess.get(ctx.message.from.id) != ctx.message.reply_to_message.message_id
  )
    return;
  try {
    let hosts = await generate(ctx.message.text.split(" "));
    let textMsg = `\`${hosts}\``;

    // Sent as file if the string length is at the maximum length.
    if (textMsg.length > 4096)
      return ctx.replyWithDocument(
        new grammy.InputFile(Buffer.from(hosts), "hosts"),
        { reply_to_message_id: ctx.message.message_id }
      );

    // Sent as text message whenever it's possible.
    ctx.reply(textMsg, {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message.message_id,
    });
  } catch (error) {
    ctx.reply(error.toString());
  }

  // Delete session when available.
  sess.delete(ctx.message.from.id);
});

bot.catch(console.error);
bot.start();

bot.api
  .getMe()
  .then(({ first_name }) => console.log(`Logged as ${first_name}!`));

process.on("unhandledRejection", console.error);
