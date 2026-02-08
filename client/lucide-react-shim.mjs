/**
 * Re-export lucide-react and alias CloudUpload -> UploadCloud for packages
 * (e.g. @privy-io/react-auth) that import the old icon name.
 */
export * from "lucide-react-real";
export { UploadCloud as CloudUpload } from "lucide-react-real";
