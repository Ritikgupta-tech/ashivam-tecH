import {
  createInquiry,
  getInquiryById,
  listInquiries,
  updateInquiry,
  deleteInquiry,
} from "./inquiry.service.js";

import {
  validateCreateInquiry,
  validateInquiryUpdate,
} from "./inquiry.validator.js";

export const create = async (req, res, next) => {
  try {
    const validation = validateCreateInquiry(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const inquiry = await createInquiry(validation.data);

    return res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: {
        inquiry,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const result = await listInquiries({
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const inquiry = await getInquiryById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        inquiry,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const validation = validateInquiryUpdate(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const inquiry = await updateInquiry(
      req.params.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Inquiry updated successfully",
      data: {
        inquiry,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await deleteInquiry(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};