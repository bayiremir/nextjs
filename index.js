const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const jwt = require("jsonwebtoken");
const app = express();
const port = 3000;
const axios = require("axios");

// Kullanıcı ve Etkinlik modellerini tanımla
const User = require("./models/User");
const Event = require("./models/Event");
const Club = require("./models/Club");
const Announcement = require("./models/Announcement");
const Admin = require("./models/Admin");
const Evaluation = require("./models/Evaluation");
const SKSEvent = require("./models/SKSEvent");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = "your_jwt_secret"; // JWT imzalamak için kullanılan gizli anahtar

mongoose
  .connect("mongodb+srv://bayiremir2:Beratbyr241@sks.relhmn9.mongodb.net/", {})
  .then(() => {
    console.log("Connected to the Database successfully");
  })
  .catch((err) => {
    console.error("Error: ", err);
  });
// Passport JWT ayarları
passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload._id);
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        const user = await User.findOne({ username });
        if (!user) {
          return done(null, false, { message: "User not found" });
        }
        const validate = await user.isValidPassword(password);
        if (!validate) {
          return done(null, false, { message: "Wrong Password" });
        }
        return done(null, user, { message: "Logged in Successfully" });
      } catch (error) {
        return done(error);
      }
    }
  )
);

app.get("/fetch-events", async (req, res) => {
  try {
    const response = await axios.get(
      "https://yp.uskudar.dev/api/category-content/lists/4/etkinlik/tr?token=1&page=1&limit=10"
    );
    const events = response.data.contents;

    // Process each event asynchronously
    const processEvents = events.map(async (event) => {
      // Check if the event already exists in the database
      const existingEvent = await SKSEvent.findOne({ id: event.id });
      if (!existingEvent) {
        // Save the event to the database if it does not exist
        const sksEvent = new SKSEvent({
          category_name: event.category_name,
          created_at: event.created_at,
          event_infos: event.event_infos,
          id: event.id,
          image: event.image,
          lang: event.lang,
          slug: event.slug,
          spot: event.spot,
          staff: event.staff,
          title: event.title,
          updated_at: event.updated_at,
        });
        await sksEvent.save();
        return sksEvent; // Return new event object
      }
      return existingEvent; // Return existing event object
    });

    // Wait for all events to be processed
    const processedEvents = await Promise.all(processEvents);

    // Send the processed events as the response
    res.send(processedEvents);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error fetching events",
      error: error.message,
    });
  }
});

app.get("/fetch-events/:eventId", async (req, res) => {
  try {
    // Ensure you're using the correct parameter name as defined in your route
    const eventId = req.params.eventId;
    const event = await SKSEvent.findOne({ id: eventId });

    if (event) {
      res.send(event);
    } else {
      // It's a good practice to handle the case where no event is found
      res.status(404).send({ message: "Event not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error fetching event",
      error: error.message,
    });
  }
});

// Register route
app.post("/register", async (req, res) => {
  const { username } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      // Kullanıcı zaten varsa oturum açtır
      const skstoken = jwt.sign(existingUser.toJSON(), opts.secretOrKey);
      return res.json({ user: existingUser, skstoken });
    } else {
      const newUser = new User({ username });
      await newUser.save();
      const skstoken = jwt.sign(newUser.toJSON(), opts.secretOrKey);
      return res.status(201).json({ user: newUser, skstoken });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Login route (bu senaryoda kullanılmayabilir, çünkü register zaten login işlemi de yapıyor)
app.post("/login", async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Kullanıcıyı bulduysanız, yeni bir token oluşturun ve kullanıcıya gönderin
    await user.save();
    const skstoken = jwt.sign(user.toJSON(), opts.secretOrKey);
    return res.json({ user, skstoken });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.send(req.user);
  }
);

app.post(
  "/create-events",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const {
        activityType,
        eventName,
        date,
        description,
        location,
        poster,
        other,
        speaker,
        program,
        specialService,
        clubId,
      } = req.body;

      // Kulübün varlığını ve yetkili kullanıcıyı kontrol et
      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).send({ message: "Club not found" });
      }
      if (club.president.toString() !== req.user._id.toString()) {
        return res.status(403).send({
          message: "Unauthorized: Only the club president can create events.",
        });
      }

      // Etkinlik oluştur
      const event = new Event({
        activityType,
        eventName,
        date,
        description,
        location,
        poster,
        other,
        speaker,
        program,
        specialService,
        createdBy: req.user._id,
        club: clubId,
        createdTime: new Date(),
      });

      // Etkinliği kaydet
      await event.save();
      res.status(201).send(event);
    } catch (error) {
      console.log(error);

      if (error.name === "MongoServerError" && error.code === 11000) {
        return res.status(400).send({
          message: "Error: Duplicate key error",
          detail: error.message,
        });
      }

      res
        .status(400)
        .send({ message: "Error creating event", error: error.message });
    }
  }
);

// show all user information
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.send(users);
  } catch (error) {
    res.status;
  }
});

// show all approved announcements
app.get("/announcements/approved", async (req, res) => {
  try {
    const approvedAnnouncements = await Announcement.find({ isApproved: true })
      .populate("club", "baslik resim isPresident")
      .exec();

    res.status(200).send(approvedAnnouncements);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error fetching approved announcements",
      error: error.message,
    });
  }
});

app.get("/clubs", async (req, res) => {
  try {
    const clubs = await Club.find();
    res.send(clubs);
  } catch (error) {
    res.status;
  }
});

app.post(
  "/create-announcement",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { title, body, clubId, link, visibility } = req.body;

    try {
      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).send({ message: "Club not found" });
      }

      if (!title || !body) {
        return res.status(400).send({ message: "Title and body are required" });
      }

      const announcement = new Announcement({
        title,
        body,
        club: clubId,
        link,
        visibility,
      });

      await announcement.save();
      res.status(201).send(announcement);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ message: "Error creating announcement", error: error.message });
    }
  }
);

// Endpoint to get announcements according to visibility and club membership
app.get(
  "/announcements",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id).populate("clubs.id");

      const clubIds = user.clubs.map((club) => club.id.toString());

      const announcements = await Announcement.find({
        $or: [
          { visibility: "all" }, // Global announcements
          {
            $and: [
              { visibility: "club" },
              { club: { $in: clubIds } }, // Ensuring the announcement's club is one of the user's clubs
            ],
          },
        ],
      }).populate("club");

      res.status(200).send(announcements);
    } catch (error) {
      console.error("Failed to fetch announcements: ", error);
      res.status(500).send({
        message: "Error fetching announcements",
        error: error.message,
      });
    }
  }
);

//show announcements for club id
app.get("/announcements/:clubId", async (req, res) => {
  try {
    const { clubId } = req.params;
    const announcements = await Announcement.find({ club: clubId });

    res.send(announcements);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error fetching announcements",
      error: error.message,
    });
  }
});

// remove announcement
app.delete(
  "/announcements/:announcementId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { announcementId } = req.params;

    try {
      const announcement = await Announcement.findById(announcementId);

      if (!announcement) {
        return res.status(404).send({ message: "Announcement not found" });
      }

      // Find the club associated with the announcement before deleting it
      const club = await Club.findById(announcement.club);
      if (!club) {
        return res.status(404).send({ message: "Club not found" });
      }

      // Delete the announcement
      await Announcement.findByIdAndDelete(announcementId);

      // Pull the announcement ID from the club's announcements array
      club.announcements.pull(announcementId);
      await club.save(); // Save the modified club document

      res.send({ message: "Announcement deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        message: "Error deleting announcement",
        error: error.message,
      });
    }
  }
);

// edit announcement
app.put(
  "/announcements/:announcementId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { announcementId } = req.params;
      const updates = req.body;

      const announcement = await Announcement.findById(announcementId);

      if (!announcement) {
        return res.status(404).send({ message: "Announcement not found" });
      }

      // Update fields dynamically
      if (updates.title) announcement.title = updates.title;
      if (updates.body) announcement.body = updates.body;
      if (updates.link) announcement.link = updates.link; // Handle link if it's part of your model
      if (updates.updatedDate) announcement.updatedDate = updates.updatedDate;

      await announcement.save();

      res.send({ message: "Announcement updated successfully", announcement });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        message: "Error updating announcement",
        error: error.message,
      });
    }
  }
);

//memrbership request gönderen herkesi kabul eden ve club'e member olarak ekleyen route
app.post(
  "/join-club",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { clubId, name, picture } = req.body;

      const userId = req.user._id;

      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).send({ message: "Club not found" });
      }
      // Check if user is already a member of the club
      const isAlreadyMember = club.members.some((member) =>
        member.equals(userId)
      );

      if (isAlreadyMember) {
        return res.status(400).send({
          message: "User is already a member of the club",
        });
      }

      const clubInfo = {
        id: club._id,
        name: club.baslik,
        picture: club.resim,
      };
      await User.findByIdAndUpdate(userId, {
        $push: { clubs: clubInfo },
      });

      // Save the club document after adding the user
      club.members.push({ id: userId, name, picture }); // Add this line

      // Save the updated club
      await club.save();

      res.send({
        message: "Başarıyla kulübe katıldınız!",
        club: { name: club.baslik, picture: club.resim },
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        message: "Error joining the club",
        error: error.message,
      });
    }
  }
);

// join event and save user schema with event
app.post(
  "/join-event",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const {
        eventId,
        sksid,
        title,
        image,
        spot,
        event_infos,
        created_at,
        updated_at,
      } = req.body;
      const userId = req.user._id; // JWT'den gelen kullanıcı ID'sini alın
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      // Check if the user has already joined the event
      const isAlreadyJoined = user.events.some(
        (event) => event.sksid === sksid.toString()
      );
      console.log(isAlreadyJoined);
      if (isAlreadyJoined) {
        return res
          .status(400)
          .send({ message: "User has already joined this event." });
      }
      // Create and add event information to the user's events list
      const eventInfo = {
        id: eventId,
        sksid,
        title,
        image,
        spot,
        event_infos,
        created_at,
        updated_at,
      };
      user.events.push(eventInfo);
      await user.save(); // Update user document
      res.send({ message: "Successfully joined the event!", eventInfo });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ message: "Error joining the event", error: error.message });
    }
  }
);

app.get("/events", async (req, res) => {
  try {
    const events = await Event.find();
    res.send(events);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error fetching events",
      error: error.message,
    });
  }
});

app.get("/events/:eventId", async (req, res) => {
  try {
    const event = await Event.findOne(req.params.eventId);
    res.send(event);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error fetching event",
      error: error.message,
    });
  }
});

app.post("/add-admin", async (req, res) => {
  try {
    const { userId } = req.body;
    const userExists = await User.findById(userId); // Kullanıcının varlığını kontrol et

    if (!userExists) {
      return res.status(404).send({ message: "User not found" });
    }

    // Kullanıcı zaten Admin mi kontrol et
    const adminExists = await Admin.findOne({ userId: userId });
    if (adminExists) {
      return res.status(400).send({ message: "User is already an admin" });
    }

    // Yeni admin kaydı oluştur
    const admin = new Admin({ userId: userId });
    await admin.save();

    res.send({ message: "User is now an admin" });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error adding admin",
      error: error.message,
    });
  }
});

app.get("/list-admins", async (req, res) => {
  try {
    const admins = await Admin.find().populate("userId", "username");
    res.send(admins);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error fetching admins",
      error: error.message,
    });
  }
});

app.post("/add-president", async (req, res) => {
  try {
    const { userId, clubId } = req.body;

    // Find the user and club from the database
    const user = await User.findById(userId);
    const club = await Club.findById(clubId);

    // Check if user and club exist
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    if (!club) {
      return res.status(404).send({ message: "Club not found" });
    }

    // Check if the user is already the president of the club
    if (club.isPresident && club.isPresident.equals(userId)) {
      return res
        .status(400)
        .send({ message: "User is already the president of this club" });
    }

    // Update the club document with the new president
    club.isPresident = userId;
    await club.save();

    // Update the user document to reflect the new club presidency
    // Assuming 'presidentOf' should include relevant club details
    const alreadyPresidentOf = user.presidentOf.some((p) =>
      p.id.equals(clubId)
    );
    if (!alreadyPresidentOf) {
      user.presidentOf.push({ id: clubId, name: club.name || club.baslik }); // Ensure 'name' or 'baslik' exists
      await user.save();
    }

    res.send({ message: "User is now the president of the club" });
  } catch (error) {
    console.error("Error adding president:", error);
    res.status(500).send({
      message: "Error adding president",
      error: error.message,
    });
  }
});

//  admin
app.get(
  "/admin/announcements/unapproved",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).send({
        message: "Unauthorized: Only admins can access this endpoint",
      });
    }

    try {
      const unapprovedAnnouncements = await Announcement.find({
        isApproved: false,
      })
        .populate("club", "baslik resim isPresident")
        .exec();

      res.status(200).send(unapprovedAnnouncements);
    } catch (error) {
      console.error(error);
      res.status(500).send({
        message: "Error fetching unapproved announcements",
        error: error.message,
      });
    }
  }
);

// Admin tarafından duyuru onaylama
app.post(
  "/admin/announcements/approve/:announcementId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).send({
        message: "Unauthorized: Only admins can access this endpoint",
      });
    }

    try {
      const { announcementId } = req.params;
      const announcement = await Announcement.findById(announcementId);

      if (!announcement) {
        return res.status(404).send({ message: "Announcement not found" });
      }

      announcement.isApproved = true;
      announcement.updatedDate = new Date(); // Set the updatedDate to the current date
      await announcement.save();

      res.status(200).send({ message: "Announcement approved successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        message: "Error approving announcement",
        error: error.message,
      });
    }
  }
);

app.post(
  "/invite-to-club",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { clubId, username } = req.body;

    try {
      const club = await Club.findById(clubId);
      const user = await User.findOne({ username: username });

      if (!club) {
        return res.status(404).send({ message: "Club not found" });
      }
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      // Check if the user is already a member of the club
      const isAlreadyMember = club.members.some((member) =>
        member.id.equals(user._id)
      );
      if (isAlreadyMember) {
        return res
          .status(400)
          .send({ message: "User is already a member of the club" });
      }

      // Check if the user has already been invited to the club
      const isAlreadyInvited = user.invitations.some((invitation) =>
        invitation.clubId.equals(club._id)
      );
      if (isAlreadyInvited) {
        return res
          .status(400)
          .send({ message: "User has already been invited to the club" });
      }

      // Proceed to add the invitation to the user's document
      await User.findByIdAndUpdate(user._id, {
        $push: {
          invitations: {
            clubId: club._id,
            clubName: req.body.clubName,
            clubPicture: req.body.clubPicture,
          },
        },
      });

      res.status(200).send({
        message: "Invitation sent successfully",
        user: user.username,
        club: club.name,
        clubPicture: club.picture,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        message: "Error inviting user to the club",
        error: error.message,
      });
    }
  }
);

app.post(
  "/accept-invitation",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { clubId, name, picture } = req.body;
      const userId = req.user._id;

      // Find the club and user by their IDs
      const club = await Club.findById(clubId);
      const user = await User.findById(userId);

      if (!club) {
        return res.status(404).send({ message: "Club not found" });
      }
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      // Check if the user is already a member
      const isAlreadyMember = club.members.some((member) =>
        member.equals(userId)
      );
      if (isAlreadyMember) {
        return res
          .status(400)
          .send({ message: "User is already a member of the club" });
      }

      // Check if the user is invited
      const isInvited = user.invitations.some((inv) =>
        inv.clubId.equals(clubId)
      );
      if (!isInvited) {
        return res
          .status(400)
          .send({ message: "No invitation found for this club" });
      }

      // Transactional update if possible
      await user.updateOne({
        $addToSet: {
          clubs: { id: club._id, name: club.baslik, picture: club.resim },
        },
        $pull: { invitations: { clubId: club._id } },
      });

      await club.updateOne({
        $addToSet: { members: { id: userId, name, picture } },
      });

      res.send({
        message: "Successfully joined the club and invitation removed!",
        club: { name: club.baslik, picture: club.resim },
        user: { name: user.name, picture: user.picture },
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        message: "Error accepting the invitation to join the club",
        error: error.message,
      });
    }
  }
);

app.get(
  "/invitations",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send(user.invitations);
    } catch (error) {
      console.error(error);
      res.status(500).send({
        message: "Error fetching invitations",
        error: error.message,
      });
    }
  }
);

app.post(
  "/evaluations",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { eventId, eventName, content, rating, informed, comments } =
      req.body;
    const userId = req.user._id;
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const evaluation = new Evaluation({
        eventId,
        eventName,
        content,
        rating,
        informed,
        comments,
      });

      await evaluation.save();

      await User.findByIdAndUpdate(userId, {
        $push: {
          evaluations: [
            {
              eventId: eventId,
              eventName: eventName,
              content: content,
              informed: informed,
              rating: rating,
              createdAt: new Date(),
            },
          ],
        },
      });

      res.status(201).json(evaluation);
    } catch (error) {
      res.status(400).json({
        message: "Error processing your request",
        error: error.message,
      });
    }
  }
);

app.get("/evaluations/:eventId", async (req, res) => {
  try {
    const evaluations = await Evaluation.find({ eventId: req.params.eventId });
    res.send(evaluations);
  } catch (error) {
    res.status(500).send({
      message: "Error fetching evaluations",
      error: error.message,
    });
  }
});

// Server'ı başlat
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
