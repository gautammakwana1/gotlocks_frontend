import { redirect } from "next/navigation";

const CagExplainedPage = () => {
  redirect("/cag-form?type=league");
};

export default CagExplainedPage;
