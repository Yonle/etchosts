require("dotenv").config();
const grammy = require("grammy");
const resolver = require('dns').promises;

const bot = new grammy.Bot(process.env.BOT_TOKEN)

// When required
resolver.setServers(['1.1.1.1']);

bot.command("start", ctx => ctx.reply("Hi! I'm /etc/hosts generator bot!\nPlease sent an hostname (each domain separated with space) to generate the text!\n\n* There's still no support to resolve a IP address behind Cloudflare(yet)\n* Still has no support to resolve onion address (yet)\n\nThis bot uses 1.1.1.1 DNS to resolve a hostname."));
bot.catch = err => console.error;
bot.on("message:text", ctx => {
	let hosts = [];
	let toResolve = ctx.message.text.split(" ");
	toResolve.forEach(async (host, num) => {
		host = /(?:https?:\/\/)?([\w\d\.\-]+)/.exec(host.toLowerCase())[1];
		if (host.endsWith(".onion")) return ctx.reply(`\`[i] I skipped ${host} because i'm not supporting .onion domain yet.\``, { parse_mode: "MarkdownV2" })
		try {
			let ips = (await resolver.lookup(host, { all: true })).map(ip => ip.address);
			hosts.push(ips.join(`\t${host}\n`) + `\t${host}`);

			//((num+1) == toResolve.length) && await ctx.reply("`" + hosts.join("\n") + "`", { parse_mode: "Markdown" });
		} catch (e) {
			console.error(e);
		}
	});
	setTimeout(() => {
		if (("`" + hosts.join("\n") + "`").length > 4000) return ctx.replyWithDocument(new grammy.InputFile(Buffer.from(hosts.join("\n")), 'hosts'));
		ctx.reply("`" + hosts.join("\n") + "`", { parse_mode: "Markdown" })
	}, 3000);
});

bot.start();
process.on('unhandledRejection', console.error);
