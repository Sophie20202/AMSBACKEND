import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import sendEmail from "../helpers/sendMail";
import { User } from "../Types/users";
import { generateToken } from "../helpers/auth";

const prisma = new PrismaClient();

interface UserController {
  getAllUsers(req: Request, res: Response): Promise<Response>;
  getUserById(req: Request, res: Response): Promise<Response>;
  createUser(req: Request, res: Response): Promise<Response>;
  bulkAddUsers(req: Request, res: Response): Promise<Response>; // New function declaration
  updateUser(req: Request, res: Response): Promise<Response>;
  deleteUser(req: Request, res: Response): Promise<Response>;
}

const UserController: UserController = {
  getAllUsers: async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        include: {
          organizationEmployed: {
            include: {
              district: true,
              sector: true,
              country: true,
              workingSector: true,
            },
          },
          organizationFounded: {
            include: {
              district: true,
              sector: true,
              country: true,
              workingSector: true,
            },
          },
          role: true,
          gender: true,
          residentDistrict: true,
          residentSector: true,
          residentCountry: true,
          cohort: true,
          track: true,
          profileImage: true,
        },
      });

      return res.status(200).json({
        message: "List of all users",
        data: users,
        count: users.length,
      });
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  getUserById: async (req, res) => {
    const { userId } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          organizationEmployed: {
            include: {
              district: true,
              sector: true,
              workingSector: true,
              country: true,
            },
          },
          organizationFounded: {
            include: {
              district: true,
              sector: true,
              workingSector: true,
              country: true,
            },
          },
          gender: true,
          residentDistrict: true,
          residentSector: true,
          cohort: true,
          role: true,
          track: true,
          profileImage: true,
          residentCountry: true,
        },
      });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json(user);
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  createUser: async (req, res) => {
    const { user, organizationFounded, organizationEmployed } = req.body;

    if (!user?.email) {
      return res
        .status(409)
        .json({ error: "You can't add a user without email address!" });
    }

    try {
      const userExisting = await prisma.user.findFirst({
        where: { email: user?.email },
      });

      if (userExisting) {
        return res
          .status(409)
          .json({ error: "User with this email already exists" });
      }

      const organizationFoundedCreate = await prisma.organization.create({
        data: organizationFounded,
      });

      const organizationEmployedCreate = await prisma.organization.create({
        data: organizationEmployed,
      });

      const refreshToken = await generateToken(user);

      const createdUser = await prisma.user.create({
        data: {
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          email: user.email,
          residentCountry: {
            connect: {
              id: user?.residentCountryId
                ? user?.residentCountryId
                : "unspecified",
            },
          },
          residentDistrict: {
            connect: {
              id: user.residentDistrictId
                ? user?.residentDistrictId
                : "unspecified",
            },
          },
          residentSector: {
            connect: {
              id: user.residentSectorId
                ? user?.residentSectorId
                : "unspecified",
            },
          },
          phoneNumber: user.phoneNumber,
          whatsappNumber: user.whatsappNumber,
          gender: {
            connect: {
              name: user.genderName ? user?.genderName : "Not Specified",
            },
          },
          nearestLandmark: user.nearestLandmark,
          cohort: { connect: { id: user.cohortId ? user?.cohortId : 0 } },
          track: {
            connect: { id: user.trackId ? user?.trackId : "unspecified" },
          },
          profileImage: {
            connect: {
              id: user?.profileImageId ? user?.profileImageId : "default",
            },
          },
          bio: user?.bio || "",
          organizationFounded: {
            connect: { id: organizationFoundedCreate.id },
          },
          positionInFounded: user.positionInFounded,
          organizationEmployed: {
            connect: { id: organizationEmployedCreate.id },
          },
          positionInEmployed: user.positionInEmployed,
          password: user.password,
          refreshToken: refreshToken,
          createdAt: new Date(),
        },
      });

      if (createdUser) {
        const email = await sendEmail({
          subject: "Your profile created successfully!",
          name: createdUser.firstName,
          message:
            "Your profile has been created on AMS. Use this link to set the password: " +
            process.env.FRONTEND_URL +
            "/reset-password/" +
            createdUser.refreshToken,
          receiver: createdUser.email,
        });

        const notification = {
          title: "ACCOUNT: Your new account has been created!",
          message: `<p>Hi ${user?.firstName},<br><p>Welcome aboard! Your account has been created and now you can start engaging with others through chats, and update your  profile from time to time!</p><p>Here's what you can do:</p><ul><li>Participate in conversations,</li><li>Monitor and update your profile,</li></ul><p>Again, you are most welcome, if you have any question, don't hesitate to contact the admin!</p><div><a href='/dashboard/chat'>Join Conversation</a><a href='/dashboard/profile'>View Profile</a></div><p>We hope you keep having a great time.</p><p>Best Regards,<br>The Admin</p>`,
          receiverId: createdUser?.id,
          opened: false,
          createdAt: new Date(),
        };

        await prisma.notifications.create({
          data: notification,
        });

        return res.status(201).json({
          message: "User created successfully",
          user: createdUser,
          ...email,
        });
      } else {
        return res.status(500).json({ message: "Create user failed" });
      }
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  bulkAddUsers: async (req, res) => {
    const { users } = req.body;

    try {
      console.log(users);
      const createdUsers = await Promise.all(
        users.map(async (user: User) => {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            console.log(
              `User with email ${user.email} already exists. Skipping.`
            );
            return res.status(409).send({
              message: `User with email ${user.email} already exists.`,
            });
          }

          const createdUser = await prisma.user.create({
            data: {
              firstName: user.firstName,
              middleName: user.middleName,
              lastName: user.lastName,
              email: user.email,
              phoneNumber: user.phoneNumber,
              whatsappNumber: user.whatsappNumber,
              genderName: user.genderName,
              trackId: user.trackId,
              createdAt: new Date(),
            },
          });

          const notification = {
            title: "ACCOUNT: Your new account has been created!",
            message: `<p>Hi ${user?.firstName},<br><p>Welcome aboard! Your account has been created and now you can start engaging with others through chats, and update your  profile from time to time!</p><p>Here's what you can do:</p><ul><li>Participate in conversations,</li><li>Monitor and update your profile,</li></ul><p>Again, you are most welcome, if you have any question, don't hesitate to contact the admin!</p><div><a href='/dashboard/chat'>Join Conversation</a><a href='/dashboard/profile'>View Profile</a></div><p>We hope you keep having a great time.</p><p>Best Regards,<br>The Admin</p>`,
            receiverId: createdUser?.id,
            opened: false,
            createdAt: new Date(),
          };

          await prisma.notifications.create({
            data: notification,
          });

          return createdUser;
        })
      );

      const filteredUsers = createdUsers.filter((user) => user !== null);

      return res.status(201).json({
        status: 201,
        message: "Users created successfully",
        data: filteredUsers,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  updateUser: async (req, res) => {
    const { userId } = req.params;
    const { user, organizationFounded, organizationEmployed } = req.body;
    let organizationFoundedUpdate: any;
    let organizationEmployedUpdate: any;
    let founded: any;
    let employed: any;

    try {
      if (organizationEmployed.id !== "" || organizationFounded.id !== "") {
        founded = await prisma.organization.findFirst({
          where: { id: organizationFounded.id },
        });
        employed = await prisma.organization.findFirst({
          where: { id: organizationEmployed.id },
        });
      } else if (!organizationFounded.id) {
        founded = null;
      } else if (!organizationEmployed.id) {
        employed = null;
      }

      if (founded) {
        organizationFoundedUpdate = await prisma.organization.update({
          where: { id: founded.id },
          data: {
            name: organizationFounded?.name,
            workingSector: {
              connect: {
                id: organizationFounded?.workingSector
                  ? organizationFounded?.workingSector
                  : "unspecified",
              },
            },
            district: {
              connect: {
                name: organizationFounded?.districtId
                  ? organizationFounded?.districtId
                  : "Not Specified",
              },
            },
            sector: {
              connect: {
                id: organizationFounded?.sectorId
                  ? organizationFounded?.sectorId
                  : "unspecified",
              },
            },
            country: {
              connect: {
                id: organizationFounded?.countryId
                  ? organizationFounded?.countryId
                  : "unspecified",
              },
            },
            website: organizationFounded?.website,
          },
        });
      } else {
        organizationFoundedUpdate = await prisma.organization.create({
          data: {
            name: organizationFounded?.name,
            workingSector: {
              connect: {
                id: organizationFounded?.workingSector
                  ? organizationFounded?.workingSector
                  : "unspecified",
              },
            },
            district: {
              connect: {
                name: organizationFounded?.districtId
                  ? organizationFounded?.districtId
                  : "Not Specified",
              },
            },
            sector: {
              connect: {
                id: organizationFounded?.sectorId
                  ? organizationFounded?.sectorId
                  : "unspecified",
              },
            },
            country: {
              connect: {
                id: organizationFounded?.countryId
                  ? organizationFounded?.countryId
                  : "unspecified",
              },
            },
            website: organizationFounded?.website,
          },
        });
      }

      if (employed) {
        organizationEmployedUpdate = await prisma.organization.update({
          where: { id: employed.id },
          data: {
            name: organizationEmployed?.name,
            workingSector: {
              connect: {
                id: organizationEmployed?.workingSector
                  ? organizationEmployed?.workingSector
                  : "unspecified",
              },
            },
            district: {
              connect: {
                name: organizationFounded?.districtId
                  ? organizationFounded?.districtId
                  : "Not Specified",
              },
            },
            sector: {
              connect: {
                id: organizationEmployed?.sectorId
                  ? organizationEmployed?.sectorId
                  : "unspecified",
              },
            },
            country: {
              connect: {
                id: organizationEmployed?.countryId
                  ? organizationEmployed?.countryId
                  : "unspecified",
              },
            },
            website: organizationEmployed?.website,
          },
        });
      } else {
        organizationEmployedUpdate = await prisma.organization.create({
          data: {
            name: organizationEmployed?.name,
            workingSector: {
              connect: {
                id: organizationEmployed?.workingSector
                  ? organizationEmployed?.workingSector
                  : "unspecified",
              },
            },
            district: {
              connect: {
                name: organizationFounded?.districtId
                  ? organizationFounded?.districtId
                  : "Not Specified",
              },
            },
            country: {
              connect: {
                id: organizationEmployed?.countryId
                  ? organizationEmployed?.countryId
                  : "unspecified",
              },
            },
            sector: {
              connect: {
                id: organizationEmployed?.sectorId
                  ? organizationEmployed?.sectorId
                  : "unspecified",
              },
            },
            website: organizationEmployed?.website,
          },
        });
      }

      const userExists = await prisma.user.findFirst({ where: { id: userId } });

      if (!userExists) {
        return res.status(404).json({ message: "User does not exist!" });
      }

      if (user?.email !== userExists?.email) {
        return res.status(500).json({
          message:
            "Updating user's email is not allowed! Request admin to do it for you!",
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          email: user.email,
          residentDistrict: {
            connect: {
              id: user.residentDistrictId
                ? user.residentDistrictId
                : "unspecified",
            },
          },
          residentCountry: {
            connect: {
              id: user.residentCountryId
                ? user.residentCountryId
                : "unspecified",
            },
          },
          residentSector: {
            connect: {
              id: user.residentSectorId ? user.residentSectorId : "unspecified",
            },
          },
          phoneNumber: user.phoneNumber,
          whatsappNumber: user.whatsappNumber,
          gender: {
            connect: {
              name: user.genderName ? user.genderName : "Not Specified",
            },
          },
          nearestLandmark: user.nearestLandmark,
          cohort: {
            connect: {
              id: user?.cohortId ? user?.cohortId : 0,
            },
          },
          track: { connect: { id: user.track ? user.track : "unspecified" } },
          bio: user?.bio || "",
          organizationFounded: {
            connect: { id: organizationFoundedUpdate?.id },
          },
          positionInFounded: user.positionInFounded,
          organizationEmployed: {
            connect: { id: organizationEmployedUpdate?.id },
          },
          positionInEmployed: user.positionInEmployed,
          password: user.password,
          profileImage: {
            connect: {
              id: user?.profileImageId ? user?.profileImageId : "default",
            },
          },
          updatedAt: new Date(),
        },
      });

      if (updatedUser) {
        const notification = {
          title: "UPDATED: Your account has been updated!",
          message: `<p>Hi ${user?.firstName},<br><p>Your profile has been updated successfully! It's important to keep your information up to date to help us help you!</p><p>Here's what you can do now:</p><ul><li>Participate in conversations,</li><li>Monitor and update your profile,</li></ul><p>Again, thank you for updating your profile, if you have any question, don't hesitate to contact the admin!</p><div><a href='/dashboard/chat'>Join Conversation</a><a href='/dashboard/profile'>View Profile</a></div><p>We hope you keep having a great time.</p><p>Best Regards,<br>The Admin</p>`,
          receiverId: updatedUser?.id,
          opened: false,
          createdAt: new Date(),
        };

        await prisma.notifications.create({
          data: notification,
        });

        const email = await sendEmail({
          subject: notification.title,
          name: updatedUser.firstName,
          message: notification.message,
          receiver: updatedUser.email,
        });

        return res.status(201).json({
          message: "User updated successfully",
          user: updatedUser,
          ...email,
        });
      } else {
        return res.status(500).json({ message: "Updating user failed" });
      }
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  deleteUser: async (req, res) => {
    const { userId } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        const deleted = await prisma.user.delete({
          where: { id: userId },
        });
        if (deleted) {
          return res.status(201).json({ message: "User deleted succesfully" });
        } else {
          return res.status(500).json({ message: "User delete failed" });
        }
      } else {
        return res.status(404).json({ error: "User not found!" });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
};

export default UserController;
