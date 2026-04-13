import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background">
    <h1 className="text-6xl font-bold text-foreground">404</h1>
    <p className="mt-4 text-lg text-muted-foreground">Страница не найдена</p>
    <Link to="/" className="mt-8">
      <Button>На главную</Button>
    </Link>
  </div>
);

export default NotFound;
