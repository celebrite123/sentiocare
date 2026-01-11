import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Eye } from "lucide-react";
import { format } from "date-fns";

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: string | null;
  tags: string[] | null;
  viewCount: number;
  readTime?: number;
}

const BlogCard = ({ 
  slug, 
  title, 
  excerpt, 
  featuredImageUrl, 
  publishedAt, 
  tags, 
  viewCount,
  readTime = 5 
}: BlogCardProps) => {
  return (
    <Link to={`/blog/${slug}`}>
      <Card className="group overflow-hidden border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* Featured Image */}
        {featuredImageUrl && (
          <div className="aspect-video overflow-hidden bg-muted">
            <img 
              src={featuredImageUrl} 
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        <div className="p-5 flex-1 flex flex-col">
          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
            {title}
          </h3>
          
          {/* Excerpt */}
          {excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-3 flex-1">
              {excerpt}
            </p>
          )}
          
          {/* Meta */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            {publishedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(publishedAt), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{readTime} min read</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{viewCount}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default BlogCard;
