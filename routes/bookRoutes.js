import express from "express";
import Book from "../models/Book.js";
import User from "../models/User.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Create Book (Admin)
router.post("/", protect, requireRole("admin"), async (req, res) => {
  try {
    const { title, author, category, availableCopies } = req.body;
    if (!title || !author || !category) return res.status(400).json({ message: "Title, author, category required" });
    const book = await Book.create({ title, author, category, availableCopies: Number(availableCopies) || 1 });
    return res.status(201).json(book);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Get all books
router.get("/", protect, async (req, res) => {
  const books = await Book.find().sort({ createdAt: -1 });
  return res.json(books);
});

// Update book (Admin)
router.put("/:id", protect, requireRole("admin"), async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ message: "Book not found" });
    return res.json(book);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Delete book (Admin)
router.delete("/:id", protect, requireRole("admin"), async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    return res.json({ message: "Book deleted" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Borrow book (User)
router.post("/borrow/:id", protect, requireRole("user", "admin"), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.availableCopies < 1) return res.status(400).json({ message: "No copies available" });

    book.availableCopies -= 1;
    await book.save();

    const user = await User.findById(req.user.id);
    user.borrowedBooks.push({ bookId: book._id });
    await user.save();

    return res.json({ message: "Book borrowed", availableCopies: book.availableCopies });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Return book (User)
router.post("/return/:id", protect, requireRole("user", "admin"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const entry = user.borrowedBooks.find(b => String(b.bookId) === req.params.id && !b.returnedAt);
    if (!entry) return res.status(400).json({ message: "You haven't borrowed this book or already returned" });

    entry.returnedAt = new Date();
    await user.save();

    const book = await Book.findById(req.params.id);
    if (book) {
      book.availableCopies += 1;
      await book.save();
    }

    return res.json({ message: "Book returned" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

export default router;
