import dayjs from "dayjs";

// get current year helper
export const getCurrentYear = () => {
  const year = dayjs().year();
  return year;
};
