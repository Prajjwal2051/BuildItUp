
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"

const AddRepoButton = () => {
    return (
        <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 flex items-center gap-1.5 border-[#010101] bg-[#ffffff] text-[#010101] hover:bg-[#95e8ae] hover:text-[#080107] transition-colors"
        >
            <ArrowDown size={14} className="transition-transform duration-300 group-hover:translate-y-0.5" />
            <span className="text-xs font-medium">Open GitHub Repo</span>
        </Button>
    )
}

export default AddRepoButton


