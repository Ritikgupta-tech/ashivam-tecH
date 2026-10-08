import {
  createContent,
  listContent,
  getContentById,
  updateContent,
  deleteContent,
  publishContent,
  unpublishContent,
  getPublicContent,
  getPublicSectionContent,
} from "./content.service.js";

import {
  validateCreateContent,
  validateUpdateContent,
} from "./content.validator.js";

export const create = async (req, res, next) => {
  try {
    const validation = validateCreateContent(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const content = await createContent(
      req.body,
      req.user.id
    );

    return res.status(201).json({
      success: true,
      message: "Content created successfully",
      data: {
        content,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const result = await listContent(req.query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const content = await getContentById(req.params.id);

    return res.status(200).json({
      success: true,
      data: {
        content,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const validation = validateUpdateContent(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const content = await updateContent(
      req.params.id,
      req.body,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Content updated successfully",
      data: {
        content,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await deleteContent(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Content deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const publish = async (req, res, next) => {
  try {
    const content = await publishContent(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Content published successfully",
      data: {
        content,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const unpublish = async (req, res, next) => {
  try {
    const content = await unpublishContent(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Content unpublished successfully",
      data: {
        content,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const publicByKey = async (req, res, next) => {
  try {
    const content = await getPublicContent(req.params.key);

    return res.status(200).json({
      success: true,
      data: {
        content,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const publicBySection = async (req, res, next) => {
  try {
    const content = await getPublicSectionContent(
      req.params.section
    );

    return res.status(200).json({
      success: true,
      data: {
        content,
      },
    });
  } catch (error) {
    next(error);
  }
};