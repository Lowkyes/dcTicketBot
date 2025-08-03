const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const fetch = require("node-fetch");
require("dotenv").config();

setInterval(() => {
  fetch("https://0dbe80b1-e2cc-45e8-8c26-4f0626be9e71-00-bws1c45gbkms.sisko.replit.dev/");
}, 4 * 60 * 1000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const pets = [
  {
    id: 1,
    name: "Raccoon",
    description:
      "Every ~15 minutes, the Raccoon goes to another player's plot and duplicates their Crop, then gives it to the pet owner.",
    price: 6.1,
    image: "https://growagardenpro.com/pets/raccoon.webp",
  },
  {
    id: 2,
    name: "Disco Bee",
    description:
      "Disco Disco: Every ~15 minutes, has a ~16% chance a nearby fruit becomes Disco!",
    price: 6.1,
    image: "https://growagardenpro.com/pets/discobee.webp",
  },
  {
    id: 3,
    name: "Dragon Fly",
    description: "Every ~5 minutes, turns one random fruit Gold.",
    price: 4.5,
    image: "https://growagardenpro.com/pets/dragonfly.webp",
  },
  {
    id: 4,
    name: "Mimic",
    description:
      "Mimicry: Every ~20m, it mimics and copies an ability from another pet (in player garden) and performs its ability! But if a Mimic Octopus copies a pet with two abilities, it will only perform the first ability. The copied pet's cooldown isn't affected.",
    price: 3.5,
    image: "https://growagardenpro.com/pets/mimicoctopus.webp",
  },
];

const QR_IMAGE =
  "https://cdn.discordapp.com/attachments/1401451024501313656/1401563828713426976/image.png?ex=6890bb88&is=688f6a08&hm=4768810d06892f2b90bdd1cce7ca25425c21e3d78c9d0a297bfd1c2317b68f0c";
const WALLET_ADDRESS = "LXDvc4mnnxepL3JvMin2EHhTfG4mUH5WCG";
const cryptoUnitPrice = 1;
const ORDER_WEBHOOK =
  "https://discord.com/api/webhooks/1401414474757312543/cdN6rnWZVw2FUuunLRxdOLDwXSgaDV2re0s9PtCIAF2g-lLs5qMF9YCtclJDps3hN_u_";

const userCarts = {};

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const [action, userId, itemId] = interaction.customId.split("-");

  if (action === "proof") {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm-${userId}`)
        .setLabel("✅ Confirm Order")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`close-${userId}`)
        .setLabel("❌ Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
      content: "✅ Upload received. Admin will verify. You can confirm when ready:",
      components: [confirmRow],
    });
  }

  if (action === "confirm") {
    const cart = userCarts[userId] || [];
    const total = cart.reduce((sum, p) => sum + p.price, 0);
    const desc = cart.map((p) => `• ${p.name} — $${p.price}`).join("\n");

    const webhookBody = {
      embeds: [
        {
          title: `🛒 Order Confirmed by ${interaction.user.username}`,
          description: `${desc}\n\n**Total:** $${total}`,
          color: 0x00ff00,
        },
      ],
    };

    await fetch(ORDER_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
    });

    await interaction.reply({
      content: "✅ Order sent to admin. You can now close this ticket.",
    });
  }
});

client.on("messageCreate", async (message) => {
  if (
    message.channel.name?.startsWith("ticket-") &&
    message.attachments.size > 0
  ) {
    const adminRole = message.guild.roles.cache.find((r) =>
      r.name.toLowerCase().includes("admin")
    );
    await message.channel.send(
      `📬 <@&${adminRole?.id || "admin"}>, proof of payment has been submitted.`
    );
  }
});

client.login(process.env.TOKEN);
