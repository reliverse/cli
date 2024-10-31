import { useTranslations } from "next-intl";

export default function NotFoundPage() {
  const t = useTranslations("pages.not-found");
  return <h1>{t("title")}</h1>;
}
