import mongoose from "mongoose";
import Content from "./content.model.js";

const normalizeKey = (value) => value.trim().toLowerCase();

const normalizeSection = (value) => value.trim().toLowerCase();

export const createContent = async (payload, adminId) => {
  const key = normalizeKey(payload.key);

  const existing = await Content.findOne({ key });

  if (existing) {
    const error = new Error(
      `Content with key "${key}" already exists`
    );
    error.statusCode = 409;
    throw error;
  }

  const status = payload.status || "draft";

  const content = await Content.create({
    key,
    section: normalizeSection(payload.section),
    title: payload.title.trim(),
    content: payload.content,
    status,
    sortOrder: payload.sortOrder ?? 0,
    createdBy: adminId,
    updatedBy: adminId,
    publishedAt: status === "published" ? new Date() : null,
  });

  return content;
};

export const listContent = async ({
  page = 1,
  limit = 20,
  search,
  section,
  status,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const filter = {};

  if (search?.trim()) {
    filter.$text = {
      $search: search.trim(),
    };
  }

  if (section?.trim()) {
    filter.section = normalizeSection(section);
  }

  if (status) {
    filter.status = status;
  }

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Content.find(filter)
      .populate("createdBy", "username name role")
      .populate("updatedBy", "username name role")
      .sort({
        sortOrder: 1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(safeLimit)
      .lean(),

    Content.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNextPage: safePage * safeLimit < total,
      hasPreviousPage: safePage > 1,
    },
  };
};

export const getContentById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid content ID");
    error.statusCode = 400;
    throw error;
  }

  const content = await Content.findById(id)
    .populate("createdBy", "username name role")
    .populate("updatedBy", "username name role");

  if (!content) {
    const error = new Error("Content not found");
    error.statusCode = 404;
    throw error;
  }

  return content;
};

export const updateContent = async (id, payload, adminId) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid content ID");
    error.statusCode = 400;
    throw error;
  }

  const content = await Content.findById(id);

  if (!content) {
    const error = new Error("Content not found");
    error.statusCode = 404;
    throw error;
  }

  if (payload.key !== undefined) {
    const key = normalizeKey(payload.key);

    const duplicate = await Content.findOne({
      key,
      _id: { $ne: id },
    });

    if (duplicate) {
      const error = new Error(
        `Content with key "${key}" already exists`
      );
      error.statusCode = 409;
      throw error;
    }

    content.key = key;
  }

  if (payload.section !== undefined) {
    content.section = normalizeSection(payload.section);
  }

  if (payload.title !== undefined) {
    content.title = payload.title.trim();
  }

  if (payload.content !== undefined) {
    content.content = payload.content;
  }

  if (payload.sortOrder !== undefined) {
    content.sortOrder = payload.sortOrder;
  }

  if (payload.status !== undefined) {
    content.status = payload.status;

    if (payload.status === "published") {
      content.publishedAt = content.publishedAt || new Date();
    } else {
      content.publishedAt = null;
    }
  }

  content.updatedBy = adminId;

  await content.save();

  return getContentById(content._id);
};

export const deleteContent = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid content ID");
    error.statusCode = 400;
    throw error;
  }

  const content = await Content.findByIdAndDelete(id);

  if (!content) {
    const error = new Error("Content not found");
    error.statusCode = 404;
    throw error;
  }

  return content;
};

export const publishContent = async (id, adminId) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid content ID");
    error.statusCode = 400;
    throw error;
  }

  const content = await Content.findById(id);

  if (!content) {
    const error = new Error("Content not found");
    error.statusCode = 404;
    throw error;
  }

  content.status = "published";
  content.publishedAt = new Date();
  content.updatedBy = adminId;

  await content.save();

  return getContentById(content._id);
};

export const unpublishContent = async (id, adminId) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid content ID");
    error.statusCode = 400;
    throw error;
  }

  const content = await Content.findById(id);

  if (!content) {
    const error = new Error("Content not found");
    error.statusCode = 404;
    throw error;
  }

  content.status = "draft";
  content.publishedAt = null;
  content.updatedBy = adminId;

  await content.save();

  return getContentById(content._id);
};

export const getPublicContent = async (key) => {
  const content = await Content.findOne({
    key: normalizeKey(key),
    status: "published",
  }).lean();

  if (!content) {
    const error = new Error("Published content not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    key: content.key,
    section: content.section,
    title: content.title,
    content: content.content,
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
  };
};

export const getPublicSectionContent = async (section) => {
  return Content.find({
    section: normalizeSection(section),
    status: "published",
  })
    .sort({
      sortOrder: 1,
      createdAt: 1,
    })
    .select(
      "key section title content sortOrder publishedAt updatedAt"
    )
    .lean();
};