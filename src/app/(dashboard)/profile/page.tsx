"use client";

import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { PasswordStrength } from "@/components/shared/password-strength";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية (Arabic)" },
  { value: "fr", label: "Français (French)" },
  { value: "de", label: "Deutsch (German)" },
  { value: "es", label: "Español (Spanish)" },
  { value: "pt", label: "Português (Portuguese)" },
  { value: "tr", label: "Türkçe (Turkish)" },
  { value: "ru", label: "Русский (Russian)" },
  { value: "zh", label: "中文 (Chinese)" },
  { value: "ja", label: "日本語 (Japanese)" },
] as const;

export default function ProfilePage() {
  const { data, isLoading } = trpc.user.getProfile.useQuery();
  const utils = trpc.useUtils();
  const t = useTranslations("profile");
  const tc = useTranslations("common");

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">{tc("loading")}</div>
    );
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        {tc("noData")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("manageAccount")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard user={data} onUpdate={() => utils.user.getProfile.invalidate()} />
        <DisplayLanguageCard currentLocale={data.locale} />
        <ChangePasswordCard />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Card
// ---------------------------------------------------------------------------

function ProfileCard({
  user,
  onUpdate,
}: {
  user: { id: string; name: string | null; email: string; image: string | null; createdAt: Date | string };
  onUpdate: () => void;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const t = useTranslations("profile");
  const tc = useTranslations("common");

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(tc("updated"));
      onUpdate();
    },
    onError: (err) => toast.error(err.message),
  });

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profileInfo")}</CardTitle>
        <CardDescription>{t("profileInfoDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate({
              name: name || undefined,
              image: image || null,
            });
          }}
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {image && <AvatarImage src={image} alt={name} />}
              <AvatarFallback className="bg-primary/10 text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{user.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                {t("memberSince")} {format(new Date(user.createdAt), "dd MMM yyyy")}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>{t("fullName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("avatarUrl")}</Label>
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-xs text-muted-foreground">
              {t("avatarUrlDesc")}
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t("savingProfile") : t("saveProfile")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Display Language Card
// ---------------------------------------------------------------------------

function DisplayLanguageCard({ currentLocale }: { currentLocale: string }) {
  const [locale, setLocale] = useState(currentLocale);
  const t = useTranslations("profile");

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(t("changeLanguage") + " — reloading…");
      // Reload the page to apply the new language
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleChange(value: string) {
    setLocale(value);
    updateMutation.mutate({ locale: value });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("displayLanguage")}</CardTitle>
        <CardDescription>
          {t("displayLanguageDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          <Label>{t("displayLanguage")}</Label>
          <Select value={locale} onValueChange={handleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("languageReloadDesc")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Change Password Card
// ---------------------------------------------------------------------------

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const t = useTranslations("profile");
  const tc = useTranslations("common");

  const changeMutation = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success(tc("saved"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("changePassword")}</CardTitle>
        <CardDescription>
          {t("changePasswordDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            changeMutation.mutate({ currentPassword, newPassword });
          }}
        >
          <div className="space-y-1.5">
            <Label>{t("currentPassword")}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("newPassword")}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
            <PasswordStrength password={newPassword} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("confirmPassword")}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">
                {t("passwordsDoNotMatch")}
              </p>
            )}
          </div>

          {changeMutation.error && (
            <p className="text-sm text-destructive">
              {changeMutation.error.message}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit || changeMutation.isPending}>
              {changeMutation.isPending ? t("changingPassword") : t("changePassword")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
