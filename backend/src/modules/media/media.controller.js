import {
  uploadMedia,
  listMedia,
  getMediaById,
  deleteMedia,
} from "./media.service.js";

import {
  validateMediaQuery,
} from "./media.validator.js";

export const upload = async (
  req,
  res,
  next
) => {
  try {
    const media = await uploadMedia({
      file: req.file,
      adminId: req.user.id,
      req,
    });

    res.status(201).json({
      success: true,
      message: "Media uploaded successfully",
      data: {
        media,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (
  req,
  res,
  next
) => {
  try {
    const {
      page,
      limit,
    } = validateMediaQuery(req.query);

    const result = await listMedia({
      page,
      limit,
      search: req.query.search,
      category: req.query.category,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req,
  res,
  next
) => {
  try {
    const media = await getMediaById(
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: {
        media,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req,
  res,
  next
) => {
  try {
    await deleteMedia(
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};