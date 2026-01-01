import { nanoid } from "nanoid";
import { useState, useEffect } from "react";

const STRONG_KEY = "chat_username";
const ANIMALS = [
  "Axolotl",
  "Red Panda",
  "Capybara",
  "Quokka",
  "Fennec Fox",
  "Sea Otter",
  "Chinchilla",
  "Hedgehog",
  "Seal Pup",
  "Alpaca",
  "Sugar Glider",
  "Bunny",
  "Pomeranian",
  "Koala",
  "Duckling",
  "Fawn",
];

export const useUsername = () => {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STRONG_KEY);
    if (stored) {
      setUsername(stored);
    } else {
      const generated = `anon-${
        ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
      }-${nanoid(5)}`;
      localStorage.setItem(STRONG_KEY, generated);
      setUsername(generated);
    }
  }, []);

  return username;
};
