
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"

const AddRepoButton = () => {
    return (
        <Button
            variant="outline"
            size="sm"
            className="group h-8 px-2.5 flex items-center gap-1.5 border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
            <ArrowDown size={14} className="transition-transform duration-300 group-hover:translate-y-0.5" />
            <span className="text-xs font-medium">Open GitHub Repo</span>
        </Button>
    )
}

export default AddRepoButton


