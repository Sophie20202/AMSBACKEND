import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { User } from "../Types/users";

const prisma = new PrismaClient();

interface UserController {
  getAllUsers(req: Request, res: Response): Promise<Response>;
  getUserById(req: Request, res: Response): Promise<Response>;
  createUser(req: Request, res: Response): Promise<Response>;
  updateUser(req: Request, res: Response): Promise<Response>;
  deleteUser(req: Request, res: Response): Promise<Response>;
}

const UserController: UserController = {
  getAllUsers: async (req, res) => {
    try {
      const users = await prisma.user.findMany();

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
    const userData = await req.body.user;
    const organizationFounded = await req.body.organizationFounded;
    const organizationEmployed = await req.body.organizationEmployed;
    try {
      const organizationEmployedCreate = await prisma.organization.create({
        data: organizationEmployed,
      });
      const organizationFoundedCreate = await prisma.organization.create({
        data: organizationFounded,
      });

      const createdUser = await prisma.user.create({
        data: {
          firstName: userData?.firstName,
          middleName: userData?.middleName,
          lastName: userData?.lastName,
          email: userData?.email,
          residentDistrictId: userData?.residentDistrictId,
          residentSectorId: userData?.residentSectorId,
          phoneNumber: userData?.phoneNumber,
          whatsappNumber: userData?.whatsappNumber,
          genderName: userData?.genderName,
          nearestLandmark: userData?.nearestLandmark,
          cohortId: userData?.cohortId,
          track: userData?.track,
          organizationFoundedId: organizationFoundedCreate?.id,
          positionInFounded: userData?.positionInFounded,
          organizationEmployedId: organizationEmployedCreate?.id,
          positionInEmployed: userData?.positionInEmployed,
          password: userData?.password,
          createdAt: new Date(),
        },
      });

      return res
        .status(200)
        .json({ message: "User created succesfully", data: createdUser });
    } catch (error: any) {
      console.log(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  updateUser: async (req, res) => {
    const { userId } = req.params;
    const userData = req.body;
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: userData,
      });
      return res.json(updatedUser);
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },

  deleteUser: async (req, res) => {
    const { userId } = req.params;
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
};

export default UserController;