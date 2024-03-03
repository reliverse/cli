import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/islands/primitives/alert";

interface CalloutProps {
  icon?: string;
  title?: string;
  children?: React.ReactNode;
}

export function Callout({ title, children, icon, ...props }: CalloutProps) {
  return (
    <Alert {...props}>
      {icon && <span className="mr-4 text-2xl">{icon}</span>}
      {title && <AlertTitle>{title}</AlertTitle>}
      {/* @ts-expect-error ⚠️ 1.2.5 */}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
