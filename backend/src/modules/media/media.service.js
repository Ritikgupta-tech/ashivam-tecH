import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import Media from "./media.model.js";
import {
  getMediaCategory,
  validateMediaFile,
} from "./media.validator.js";
import { escapeRegex } from "../../utils/query.js";

const UPLOAD_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "media"
);

const generateSafeFileName = (originalName) => {
  const extension = path.extname(originalName).toLowerCase();

  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
};

const buildMediaUrl = (req, fileName) => {
  return `${req.protocol}://${req.get("host")}/uploads/media/${fileName}`;
};

export const uploadMedia = async ({
  file,
  adminId,
  req,
}) => {
  validateMediaFile(file);

  await fs.mkdir(UPLOAD_DIR, {
    recursive: true,
  });

  const fileName = generateSafeFileName(
    file.originalname
  );

  const storagePath = path.join(
    UPLOAD_DIR,
    fileName
  );

  await fs.writeFile(
    storagePath,
    file.buffer
  );

  const category = getMediaCategory(
    file.mimetype
  );

  const media = await Media.create({
    originalName: file.originalname,
    fileName,
    mimeType: file.mimetype,
    extension: path.extname(file.originalname)
      .toLowerCase(),
    size: file.size,
    category,
    storagePath,
    url: buildMediaUrl(req, fileName),
    uploadedBy: adminId,
  });

  return media;
};

export const listMedia = async ({
  page,
  limit,
  search,
  category,
}) => {
  const filter = {
    isActive: true,
  };

  if (category) {
    filter.category = category;
  }

  if (search?.trim()) {
    const searchRegex = new RegExp(
      escapeRegex(search.trim()),
      "i"
    );

    filter.$or = [
      {
        originalName: searchRegex,
      },
      {
        fileName: searchRegex,
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Media.find(filter)
      .populate(
        "uploadedBy",
        "username name role"
      )
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Media.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getMediaById = async (id) => {
  const media = await Media.findOne({
    _id: id,
    isActive: true,
  })
    .populate(
      "uploadedBy",
      "username name role"
    )
    .lean();

  if (!media) {
    const error = new Error(
      "Media not found"
    );

    error.statusCode = 404;
    throw error;
  }

  return media;
};

export const deleteMedia = async (id) => {
  const media = await Media.findOne({
    _id: id,
    isActive: true,
  });

  if (!media) {
    const error = new Error(
      "Media not found"
    );

    error.statusCode = 404;
    throw error;
  }

  try {
    await fs.unlink(media.storagePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  media.isActive = false;

  await media.save();

  return media;
};