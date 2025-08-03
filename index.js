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
  require("dotenv").config();

  setInterval(
    () => {
      require("node-fetch")(
        "https://0dbe80b1-e2cc-45e8-8c26-4f0626be9e71-00-bws1c45gbkms.sisko.replit.dev/",
      );
    },
    4 * 60 * 1000,
  ); // every 4 minutes

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  // Example pet products
  const pets = [
    {
      id: 1,
      name: "Raccoon",
      description: "Description: magnanacow.",
      price: 10,
      image:
        "https://www.welcomewildlife.com/wp-content/uploads/2015/01/Raccoon-face.jpg",
    },
    {
      id: 2,
      name: "Dragon Fly",
      description: "old but bold.",
      price: 10,
      image:
        "https://www.welcomewildlife.com/wp-content/uploads/2015/01/Raccoon-face.jpg",
    },
  ];

  const QR_IMAGE = "https://example.com/qr.png"; // Change to your QR code
  const WALLET_ADDRESS = "ltc mo or btc dito";
  const cryptoUnitPrice = 1; // $1 = 1 USDT

  const userCarts = {}; // temporary cart storage

  client.once("ready", () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, userId, itemId] = interaction.customId.split("-");

    if (action === "create_ticket") {
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}-${Math.floor(Math.random() * 10000)}`,
        type: 0,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ["ViewChannel"],
          },
          {
            id: interaction.user.id,
            allow: ["ViewChannel", "SendMessages"],
          },
        ],
      });

      userCarts[interaction.user.id] = [];

      await ticketChannel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [getPetsListEmbed()],
        components: [getPetsButtons()],
      });

      await interaction.reply({
        content: `✅ Ticket created: ${ticketChannel}`,
        ephemeral: true,
      });
    }

    // View pet
    if (action === "view") {
      const pet = pets.find((p) => p.id === parseInt(itemId));
      if (!pet) return;

      const embed = new EmbedBuilder()
        .setTitle(pet.name)
        .setDescription(`${pet.description}\n**Price:** $${pet.price}`)
        .setImage(pet.image);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`add-${userId}-${pet.id}`)
          .setLabel("➕ Add to Cart")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`back-${userId}`)
          .setLabel("⬅ Back to List")
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.update({ embeds: [embed], components: [row] });
    }

    // Add to cart
    if (action === "add") {
      const pet = pets.find((p) => p.id === parseInt(itemId));
      if (!pet) return;

      if (!userCarts[userId]) userCarts[userId] = [];
      userCarts[userId].push(pet);

      await interaction.reply({
        content: `✅ **${pet.name}** added to your cart!`,
        ephemeral: true,
      });
    }

    // Go back to list
    if (action === "back") {
      await interaction.update({
        embeds: [getPetsListEmbed()],
        components: [getPetsButtons(userId)],
      });
    }

    // Proceed to cart
    if (action === "cart") {
      const cart = userCarts[userId];
      if (!cart || cart.length === 0) {
        await interaction.reply({
          content: "🛒 Your cart is empty.",
          ephemeral: true,
        });
        return;
      }

      const total = cart.reduce((sum, p) => sum + p.price, 0);
      const desc = cart.map((p) => `• ${p.name} — $${p.price}`).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🛒 Your Cart")
        .setDescription(`${desc}\n\n**Total: $${total}**`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`pay-${userId}`)
          .setLabel("💳 Proceed to Payment")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`back-${userId}`)
          .setLabel("⬅ Back")
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    }

    // Show payment info
    if (action === "pay") {
      const cart = userCarts[userId];
      const total = cart.reduce((sum, p) => sum + p.price, 0);
      const cryptoAmount = (total / cryptoUnitPrice).toFixed(2);

      const embed = new EmbedBuilder()
        .setTitle("💸 Payment Info")
        .setDescription(
          `Send **${cryptoAmount} USDT** to:\n\`${WALLET_ADDRESS}\`\n\nThen upload a screenshot as proof.`,
        )
        .setImage(QR_IMAGE)
        .setColor("Green");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`proof-${userId}`)
          .setLabel("📤 I Paid (Upload Proof)")
          .setStyle(ButtonStyle.Success),
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }

    if (action === "proof") {
      await interaction.reply({
        content:
          "✅ Please upload your **proof of payment as an image or file**.\nAn admin will be notified once received.",
      });
    }

    // Close ticket
    if (action === "close") {
      await interaction.channel.send("🛑 Ticket will close in 5 seconds...");
      setTimeout(() => {
        interaction.channel.delete();
      }, 5000);
    }
  });

  client.on("messageCreate", async (message) => {
    if (
      message.channel.name.startsWith("ticket-") &&
      message.attachments.size > 0
    ) {
      const adminRole = message.guild.roles.cache.find((r) =>
        r.name.toLowerCase().includes("admin"),
      );
      await message.channel.send(
        `📬 <@&${adminRole?.id || "admin"}>, user has submitted proof of payment. Please verify.`,
      );
    }

    if (
      message.content === "!setup" &&
      message.member.permissions.has("Administrator")
    ) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`create_ticket`)
          .setLabel("🎫 Open Ticket")
          .setStyle(ButtonStyle.Primary),
      );

      await message.channel.send({
        content: "**Welcome! Click below to open a ticket and buy pets 🐾**",
        components: [row],
      });
    }
  });

  // Helper functions
  function getPetsListEmbed() {
    return new EmbedBuilder()
      .setTitle("🐾 Pet Shop")
      .setDescription("Click any button below to view more about the pet!");
  }

  function getPetsButtons(userId = "temp") {
    const row = new ActionRowBuilder();
    pets.forEach((pet) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`view-${userId}-${pet.id}`)
          .setLabel(pet.name)
          .setStyle(ButtonStyle.Secondary),
      );
    });
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`cart-${userId}`)
        .setLabel("🛒 View Cart")
        .setStyle(ButtonStyle.Primary),
    );
    return row;
  }

  client.login(process.env.TOKEN);
