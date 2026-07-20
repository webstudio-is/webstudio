export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number;
          checksum: string;
          finished_at: string | null;
          id: string;
          logs: string | null;
          migration_name: string;
          rolled_back_at: string | null;
          started_at: string;
        };
        Insert: {
          applied_steps_count?: number;
          checksum: string;
          finished_at?: string | null;
          id: string;
          logs?: string | null;
          migration_name: string;
          rolled_back_at?: string | null;
          started_at?: string;
        };
        Update: {
          applied_steps_count?: number;
          checksum?: string;
          finished_at?: string | null;
          id?: string;
          logs?: string | null;
          migration_name?: string;
          rolled_back_at?: string | null;
          started_at?: string;
        };
        Relationships: [];
      };
      Asset: {
        Row: {
          description: string | null;
          filename: string | null;
          folderId: string | null;
          id: string;
          name: string;
          projectId: string;
        };
        Insert: {
          description?: string | null;
          filename?: string | null;
          folderId?: string | null;
          id: string;
          name: string;
          projectId: string;
        };
        Update: {
          description?: string | null;
          filename?: string | null;
          folderId?: string | null;
          id?: string;
          name?: string;
          projectId?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Asset_folderId_projectId_fkey";
            columns: ["folderId", "projectId"];
            isOneToOne: false;
            referencedRelation: "AssetFolder";
            referencedColumns: ["id", "projectId"];
          },
          {
            foreignKeyName: "Asset_name_fkey";
            columns: ["name"];
            isOneToOne: false;
            referencedRelation: "File";
            referencedColumns: ["name"];
          },
        ];
      };
      AssetFileMetadata: {
        Row: {
          assetId: string;
          createdAt: string;
          document: Json;
          fieldContributions: Json;
          projectId: string;
          revision: string;
          updatedAt: string;
        };
        Insert: {
          assetId: string;
          createdAt?: string;
          document: Json;
          fieldContributions?: Json;
          projectId: string;
          revision: string;
          updatedAt?: string;
        };
        Update: {
          assetId?: string;
          createdAt?: string;
          document?: Json;
          fieldContributions?: Json;
          projectId?: string;
          revision?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "AssetFileMetadata_assetId_projectId_fkey";
            columns: ["assetId", "projectId"];
            isOneToOne: false;
            referencedRelation: "Asset";
            referencedColumns: ["id", "projectId"];
          },
        ];
      };
      AssetFolder: {
        Row: {
          createdAt: string;
          id: string;
          name: string;
          parentId: string | null;
          projectId: string;
        };
        Insert: {
          createdAt?: string;
          id?: string;
          name: string;
          parentId?: string | null;
          projectId: string;
        };
        Update: {
          createdAt?: string;
          id?: string;
          name?: string;
          parentId?: string | null;
          projectId?: string;
        };
        Relationships: [
          {
            foreignKeyName: "AssetFolder_parentId_projectId_fkey";
            columns: ["parentId", "projectId"];
            isOneToOne: false;
            referencedRelation: "AssetFolder";
            referencedColumns: ["id", "projectId"];
          },
          {
            foreignKeyName: "AssetFolder_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "AssetFolder_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      AssetResourceIndexReference: {
        Row: {
          createdAt: string;
          projectId: string;
          referenceId: string;
          resourceId: string;
          revision: string;
          type: Database["public"]["Enums"]["AssetResourceIndexReferenceType"];
        };
        Insert: {
          createdAt?: string;
          projectId: string;
          referenceId: string;
          resourceId: string;
          revision: string;
          type: Database["public"]["Enums"]["AssetResourceIndexReferenceType"];
        };
        Update: {
          createdAt?: string;
          projectId?: string;
          referenceId?: string;
          resourceId?: string;
          revision?: string;
          type?: Database["public"]["Enums"]["AssetResourceIndexReferenceType"];
        };
        Relationships: [
          {
            foreignKeyName: "AssetResourceIndexReference_index_fkey";
            columns: ["projectId", "resourceId", "revision"];
            isOneToOne: false;
            referencedRelation: "AssetResourceIndexRevision";
            referencedColumns: ["projectId", "resourceId", "revision"];
          },
        ];
      };
      AssetResourceIndexRevision: {
        Row: {
          assetRevision: string;
          checksum: string;
          createdAt: string;
          gcClaimId: string | null;
          gcStartedAt: string | null;
          objectKey: string;
          projectId: string;
          queryHash: string;
          resourceId: string;
          revision: string;
          unreferencedAt: string | null;
        };
        Insert: {
          assetRevision: string;
          checksum: string;
          createdAt?: string;
          gcClaimId?: string | null;
          gcStartedAt?: string | null;
          objectKey: string;
          projectId: string;
          queryHash: string;
          resourceId: string;
          revision: string;
          unreferencedAt?: string | null;
        };
        Update: {
          assetRevision?: string;
          checksum?: string;
          createdAt?: string;
          gcClaimId?: string | null;
          gcStartedAt?: string | null;
          objectKey?: string;
          projectId?: string;
          queryHash?: string;
          resourceId?: string;
          revision?: string;
          unreferencedAt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "AssetResourceIndexRevision_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "AssetResourceIndexRevision_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "AssetResourceIndexRevision_resource_fkey";
            columns: ["projectId", "resourceId"];
            isOneToOne: false;
            referencedRelation: "AssetResourceIndexState";
            referencedColumns: ["projectId", "resourceId"];
          },
        ];
      };
      AssetResourceIndexState: {
        Row: {
          activeRevision: string | null;
          assetRevision: string;
          buildAttemptId: string;
          buildError: Json | null;
          buildStatus: Database["public"]["Enums"]["AssetResourceIndexBuildStatus"];
          createdAt: string;
          deletedAt: string | null;
          projectId: string;
          query: string;
          queryHash: string;
          resourceId: string;
          updatedAt: string;
        };
        Insert: {
          activeRevision?: string | null;
          assetRevision: string;
          buildAttemptId: string;
          buildError?: Json | null;
          buildStatus?: Database["public"]["Enums"]["AssetResourceIndexBuildStatus"];
          createdAt?: string;
          deletedAt?: string | null;
          projectId: string;
          query: string;
          queryHash: string;
          resourceId: string;
          updatedAt?: string;
        };
        Update: {
          activeRevision?: string | null;
          assetRevision?: string;
          buildAttemptId?: string;
          buildError?: Json | null;
          buildStatus?: Database["public"]["Enums"]["AssetResourceIndexBuildStatus"];
          createdAt?: string;
          deletedAt?: string | null;
          projectId?: string;
          query?: string;
          queryHash?: string;
          resourceId?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "AssetResourceIndexState_activeRevision_fkey";
            columns: ["projectId", "resourceId", "activeRevision"];
            isOneToOne: false;
            referencedRelation: "AssetResourceIndexRevision";
            referencedColumns: ["projectId", "resourceId", "revision"];
          },
          {
            foreignKeyName: "AssetResourceIndexState_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "AssetResourceIndexState_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      AuthorizationToken: {
        Row: {
          canClone: boolean;
          canCopy: boolean;
          canPublish: boolean;
          canUseApi: boolean;
          createdAt: string;
          name: string;
          projectId: string;
          relation: Database["public"]["Enums"]["AuthorizationRelation"];
          token: string;
        };
        Insert: {
          canClone?: boolean;
          canCopy?: boolean;
          canPublish?: boolean;
          canUseApi?: boolean;
          createdAt?: string;
          name?: string;
          projectId: string;
          relation?: Database["public"]["Enums"]["AuthorizationRelation"];
          token: string;
        };
        Update: {
          canClone?: boolean;
          canCopy?: boolean;
          canPublish?: boolean;
          canUseApi?: boolean;
          createdAt?: string;
          name?: string;
          projectId?: string;
          relation?: Database["public"]["Enums"]["AuthorizationRelation"];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "AuthorizationToken_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "AuthorizationToken_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      Build: {
        Row: {
          breakpoints: string;
          createdAt: string;
          dataSources: string;
          deployment: string | null;
          id: string;
          instances: string;
          isCleaned: boolean | null;
          lastTransactionId: string | null;
          marketplaceProduct: string;
          pages: string;
          projectId: string;
          projectSettings: string;
          props: string;
          publishStatus: Database["public"]["Enums"]["PublishStatus"];
          resources: string;
          styles: string;
          styleSources: string;
          styleSourceSelections: string;
          updatedAt: string;
          version: number;
        };
        Insert: {
          breakpoints?: string;
          createdAt?: string;
          dataSources?: string;
          deployment?: string | null;
          id: string;
          instances?: string;
          isCleaned?: boolean | null;
          lastTransactionId?: string | null;
          marketplaceProduct?: string;
          pages: string;
          projectId: string;
          projectSettings?: string;
          props?: string;
          publishStatus?: Database["public"]["Enums"]["PublishStatus"];
          resources?: string;
          styles?: string;
          styleSources?: string;
          styleSourceSelections?: string;
          updatedAt?: string;
          version?: number;
        };
        Update: {
          breakpoints?: string;
          createdAt?: string;
          dataSources?: string;
          deployment?: string | null;
          id?: string;
          instances?: string;
          isCleaned?: boolean | null;
          lastTransactionId?: string | null;
          marketplaceProduct?: string;
          pages?: string;
          projectId?: string;
          projectSettings?: string;
          props?: string;
          publishStatus?: Database["public"]["Enums"]["PublishStatus"];
          resources?: string;
          styles?: string;
          styleSources?: string;
          styleSourceSelections?: string;
          updatedAt?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "Build_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Build_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      ClientReferences: {
        Row: {
          createdAt: string;
          reference: string;
          service: string;
          userId: string;
        };
        Insert: {
          createdAt?: string;
          reference?: string;
          service: string;
          userId: string;
        };
        Update: {
          createdAt?: string;
          reference?: string;
          service?: string;
          userId?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ClientReferences_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      Domain: {
        Row: {
          createdAt: string;
          domain: string;
          error: string | null;
          id: string;
          status: Database["public"]["Enums"]["DomainStatus"];
          txtRecord: string | null;
          updatedAt: string;
        };
        Insert: {
          createdAt?: string;
          domain: string;
          error?: string | null;
          id: string;
          status?: Database["public"]["Enums"]["DomainStatus"];
          txtRecord?: string | null;
          updatedAt?: string;
        };
        Update: {
          createdAt?: string;
          domain?: string;
          error?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["DomainStatus"];
          txtRecord?: string | null;
          updatedAt?: string;
        };
        Relationships: [];
      };
      domainsVirtual: {
        Row: {
          cname: string;
          createdAt: string;
          domain: string;
          domainId: string;
          domainTxtRecord: string | null;
          error: string | null;
          expectedTxtRecord: string;
          id: string;
          projectId: string;
          status: Database["public"]["Enums"]["DomainStatus"];
          updatedAt: string;
          verified: boolean;
        };
        Insert: {
          cname: string;
          createdAt: string;
          domain: string;
          domainId: string;
          domainTxtRecord?: string | null;
          error?: string | null;
          expectedTxtRecord: string;
          id: string;
          projectId: string;
          status?: Database["public"]["Enums"]["DomainStatus"];
          updatedAt: string;
          verified?: boolean;
        };
        Update: {
          cname?: string;
          createdAt?: string;
          domain?: string;
          domainId?: string;
          domainTxtRecord?: string | null;
          error?: string | null;
          expectedTxtRecord?: string;
          id?: string;
          projectId?: string;
          status?: Database["public"]["Enums"]["DomainStatus"];
          updatedAt?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "domainsVirtual_domainId_fkey";
            columns: ["domainId"];
            isOneToOne: false;
            referencedRelation: "Domain";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "domainsVirtual_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "domainsVirtual_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      File: {
        Row: {
          createdAt: string;
          description: string | null;
          format: string;
          isDeleted: boolean;
          meta: string;
          name: string;
          size: number;
          status: Database["public"]["Enums"]["UploadStatus"];
          updatedAt: string;
          uploaderProjectId: string | null;
        };
        Insert: {
          createdAt?: string;
          description?: string | null;
          format: string;
          isDeleted?: boolean;
          meta?: string;
          name: string;
          size: number;
          status?: Database["public"]["Enums"]["UploadStatus"];
          updatedAt?: string;
          uploaderProjectId?: string | null;
        };
        Update: {
          createdAt?: string;
          description?: string | null;
          format?: string;
          isDeleted?: boolean;
          meta?: string;
          name?: string;
          size?: number;
          status?: Database["public"]["Enums"]["UploadStatus"];
          updatedAt?: string;
          uploaderProjectId?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "File_uploaderProjectId_fkey";
            columns: ["uploaderProjectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "File_uploaderProjectId_fkey";
            columns: ["uploaderProjectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      latestBuildVirtual: {
        Row: {
          buildId: string;
          createdAt: string;
          domain: string;
          domainsVirtualId: string;
          projectId: string;
          publishStatus: Database["public"]["Enums"]["PublishStatus"];
          updatedAt: string;
        };
        Insert: {
          buildId: string;
          createdAt: string;
          domain: string;
          domainsVirtualId: string;
          projectId: string;
          publishStatus: Database["public"]["Enums"]["PublishStatus"];
          updatedAt?: string;
        };
        Update: {
          buildId?: string;
          createdAt?: string;
          domain?: string;
          domainsVirtualId?: string;
          projectId?: string;
          publishStatus?: Database["public"]["Enums"]["PublishStatus"];
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "latestBuildVirtual_buildId_fkey";
            columns: ["buildId"];
            isOneToOne: true;
            referencedRelation: "Build";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "latestBuildVirtual_buildId_fkey";
            columns: ["buildId"];
            isOneToOne: true;
            referencedRelation: "LatestStaticBuildPerProject";
            referencedColumns: ["buildId"];
          },
          {
            foreignKeyName: "latestBuildVirtual_buildId_fkey";
            columns: ["buildId"];
            isOneToOne: true;
            referencedRelation: "published_builds";
            referencedColumns: ["buildId"];
          },
          {
            foreignKeyName: "latestBuildVirtual_domainsVirtualId_fkey";
            columns: ["domainsVirtualId"];
            isOneToOne: true;
            referencedRelation: "domainsVirtual";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "latestBuildVirtual_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: true;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "latestBuildVirtual_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: true;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      Notification: {
        Row: {
          createdAt: string;
          id: string;
          payload: Json;
          recipientId: string;
          respondedAt: string | null;
          senderId: string;
          status: string;
          type: string;
        };
        Insert: {
          createdAt?: string;
          id?: string;
          payload?: Json;
          recipientId: string;
          respondedAt?: string | null;
          senderId: string;
          status?: string;
          type: string;
        };
        Update: {
          createdAt?: string;
          id?: string;
          payload?: Json;
          recipientId?: string;
          respondedAt?: string | null;
          senderId?: string;
          status?: string;
          type?: string;
        };
        Relationships: [];
      };
      Product: {
        Row: {
          createdAt: string;
          description: string | null;
          features: string[] | null;
          id: string;
          images: string[] | null;
          meta: Json;
          name: string;
        };
        Insert: {
          createdAt?: string;
          description?: string | null;
          features?: string[] | null;
          id: string;
          images?: string[] | null;
          meta: Json;
          name: string;
        };
        Update: {
          createdAt?: string;
          description?: string | null;
          features?: string[] | null;
          id?: string;
          images?: string[] | null;
          meta?: Json;
          name?: string;
        };
        Relationships: [];
      };
      Project: {
        Row: {
          createdAt: string;
          domain: string;
          id: string;
          isDeleted: boolean;
          marketplaceApprovalStatus: Database["public"]["Enums"]["MarketplaceApprovalStatus"];
          previewImageAssetId: string | null;
          tags: string[] | null;
          title: string;
          userId: string | null;
          workspaceId: string | null;
        };
        Insert: {
          createdAt?: string;
          domain: string;
          id: string;
          isDeleted?: boolean;
          marketplaceApprovalStatus?: Database["public"]["Enums"]["MarketplaceApprovalStatus"];
          previewImageAssetId?: string | null;
          tags?: string[] | null;
          title: string;
          userId?: string | null;
          workspaceId?: string | null;
        };
        Update: {
          createdAt?: string;
          domain?: string;
          id?: string;
          isDeleted?: boolean;
          marketplaceApprovalStatus?: Database["public"]["Enums"]["MarketplaceApprovalStatus"];
          previewImageAssetId?: string | null;
          tags?: string[] | null;
          title?: string;
          userId?: string | null;
          workspaceId?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "Project_previewImageAssetId_id_fkey";
            columns: ["previewImageAssetId", "id"];
            isOneToOne: false;
            referencedRelation: "Asset";
            referencedColumns: ["id", "projectId"];
          },
          {
            foreignKeyName: "Project_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Project_workspaceId_fkey";
            columns: ["workspaceId"];
            isOneToOne: false;
            referencedRelation: "Workspace";
            referencedColumns: ["id"];
          },
        ];
      };
      ProjectDomain: {
        Row: {
          cname: string;
          createdAt: string;
          domainId: string;
          projectId: string;
          txtRecord: string;
        };
        Insert: {
          cname: string;
          createdAt?: string;
          domainId: string;
          projectId: string;
          txtRecord: string;
        };
        Update: {
          cname?: string;
          createdAt?: string;
          domainId?: string;
          projectId?: string;
          txtRecord?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ProjectDomain_domainId_fkey";
            columns: ["domainId"];
            isOneToOne: false;
            referencedRelation: "Domain";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ProjectDomain_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ProjectDomain_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      TransactionLog: {
        Row: {
          createdAt: string;
          customerEmail: string | null;
          customerId: string | null;
          eventCreated: number | null;
          eventData: Json | null;
          eventId: string;
          eventType: string | null;
          paymentIntent: string | null;
          productId: string | null;
          status: string | null;
          subscriptionId: string | null;
          userId: string | null;
        };
        Insert: {
          createdAt?: string;
          customerEmail?: string | null;
          customerId?: string | null;
          eventCreated?: number | null;
          eventData?: Json | null;
          eventId: string;
          eventType?: string | null;
          paymentIntent?: string | null;
          productId?: string | null;
          status?: string | null;
          subscriptionId?: string | null;
          userId?: string | null;
        };
        Update: {
          createdAt?: string;
          customerEmail?: string | null;
          customerId?: string | null;
          eventCreated?: number | null;
          eventData?: Json | null;
          eventId?: string;
          eventType?: string | null;
          paymentIntent?: string | null;
          productId?: string | null;
          status?: string | null;
          subscriptionId?: string | null;
          userId?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "TransactionLog_productId_fkey";
            columns: ["productId"];
            isOneToOne: false;
            referencedRelation: "Product";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "TransactionLog_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      User: {
        Row: {
          createdAt: string;
          email: string | null;
          id: string;
          image: string | null;
          projectsTags: Json;
          provider: string | null;
          username: string | null;
        };
        Insert: {
          createdAt?: string;
          email?: string | null;
          id: string;
          image?: string | null;
          projectsTags?: Json;
          provider?: string | null;
          username?: string | null;
        };
        Update: {
          createdAt?: string;
          email?: string | null;
          id?: string;
          image?: string | null;
          projectsTags?: Json;
          provider?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      Workspace: {
        Row: {
          createdAt: string;
          id: string;
          isDefault: boolean;
          isDeleted: boolean;
          name: string;
          userId: string;
        };
        Insert: {
          createdAt?: string;
          id?: string;
          isDefault?: boolean;
          isDeleted?: boolean;
          name: string;
          userId: string;
        };
        Update: {
          createdAt?: string;
          id?: string;
          isDefault?: boolean;
          isDeleted?: boolean;
          name?: string;
          userId?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Workspace_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      WorkspaceMember: {
        Row: {
          createdAt: string;
          relation: Database["public"]["Enums"]["AuthorizationRelation"];
          removedAt: string | null;
          userId: string;
          workspaceId: string;
        };
        Insert: {
          createdAt?: string;
          relation?: Database["public"]["Enums"]["AuthorizationRelation"];
          removedAt?: string | null;
          userId: string;
          workspaceId: string;
        };
        Update: {
          createdAt?: string;
          relation?: Database["public"]["Enums"]["AuthorizationRelation"];
          removedAt?: string | null;
          userId?: string;
          workspaceId?: string;
        };
        Relationships: [
          {
            foreignKeyName: "WorkspaceMember_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "WorkspaceMember_workspaceId_fkey";
            columns: ["workspaceId"];
            isOneToOne: false;
            referencedRelation: "Workspace";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      ApprovedMarketplaceProduct: {
        Row: {
          authorizationToken: string | null;
          marketplaceProduct: string | null;
          projectId: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "Build_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Build_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      DashboardProject: {
        Row: {
          createdAt: string | null;
          domain: string | null;
          id: string | null;
          isDeleted: boolean | null;
          isPublished: boolean | null;
          marketplaceApprovalStatus:
            | Database["public"]["Enums"]["MarketplaceApprovalStatus"]
            | null;
          previewImageAssetId: string | null;
          tags: string[] | null;
          title: string | null;
          userId: string | null;
          workspaceId: string | null;
        };
        Insert: {
          createdAt?: string | null;
          domain?: string | null;
          id?: string | null;
          isDeleted?: boolean | null;
          isPublished?: never;
          marketplaceApprovalStatus?:
            | Database["public"]["Enums"]["MarketplaceApprovalStatus"]
            | null;
          previewImageAssetId?: string | null;
          tags?: string[] | null;
          title?: string | null;
          userId?: string | null;
          workspaceId?: string | null;
        };
        Update: {
          createdAt?: string | null;
          domain?: string | null;
          id?: string | null;
          isDeleted?: boolean | null;
          isPublished?: never;
          marketplaceApprovalStatus?:
            | Database["public"]["Enums"]["MarketplaceApprovalStatus"]
            | null;
          previewImageAssetId?: string | null;
          tags?: string[] | null;
          title?: string | null;
          userId?: string | null;
          workspaceId?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "Project_previewImageAssetId_id_fkey";
            columns: ["previewImageAssetId", "id"];
            isOneToOne: false;
            referencedRelation: "Asset";
            referencedColumns: ["id", "projectId"];
          },
          {
            foreignKeyName: "Project_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Project_workspaceId_fkey";
            columns: ["workspaceId"];
            isOneToOne: false;
            referencedRelation: "Workspace";
            referencedColumns: ["id"];
          },
        ];
      };
      LatestStaticBuildPerProject: {
        Row: {
          buildId: string | null;
          projectId: string | null;
          publishStatus: Database["public"]["Enums"]["PublishStatus"] | null;
          updatedAt: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "Build_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Build_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      published_builds: {
        Row: {
          buildId: string | null;
          createdAt: string | null;
          domains: string | null;
          projectId: string | null;
        };
        Insert: {
          buildId?: string | null;
          createdAt?: string | null;
          domains?: never;
          projectId?: string | null;
        };
        Update: {
          buildId?: string | null;
          createdAt?: string | null;
          domains?: never;
          projectId?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "Build_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "DashboardProject";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Build_projectId_fkey";
            columns: ["projectId"];
            isOneToOne: false;
            referencedRelation: "Project";
            referencedColumns: ["id"];
          },
        ];
      };
      user_publish_count: {
        Row: {
          count: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "Project_userId_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      UserProduct: {
        Row: {
          customerEmail: string | null;
          customerId: string | null;
          productId: string | null;
          subscriptionId: string | null;
          userId: string | null;
        };
        Relationships: [];
      };
      WorkspaceProjectAuthorization: {
        Row: {
          projectId: string | null;
          relation: string | null;
          userId: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      activate_asset_resource_index: {
        Args: {
          p_asset_revision: string;
          p_build_attempt_id: string;
          p_checksum: string;
          p_object_key: string;
          p_project_id: string;
          p_query_hash: string;
          p_resource_id: string;
          p_revision: string;
        };
        Returns: boolean;
      };
      add_asset_resource_index_reference: {
        Args: {
          p_project_id: string;
          p_reference_id: string;
          p_resource_id: string;
          p_revision: string;
          p_type: Database["public"]["Enums"]["AssetResourceIndexReferenceType"];
        };
        Returns: undefined;
      };
      begin_asset_resource_index_build: {
        Args: {
          p_asset_revision: string;
          p_build_attempt_id: string;
          p_project_id: string;
          p_query: string;
          p_query_hash: string;
          p_resource_id: string;
        };
        Returns: undefined;
      };
      cancel_asset_resource_index_build: {
        Args: {
          p_asset_revision: string;
          p_build_attempt_id: string;
          p_project_id: string;
          p_query_hash: string;
          p_resource_id: string;
        };
        Returns: boolean;
      };
      claim_asset_resource_index_garbage: {
        Args: { p_before: string; p_limit: number };
        Returns: {
          gcClaimId: string;
          objectKey: string;
          projectId: string;
          resourceId: string;
          revision: string;
        }[];
      };
      clone_project: {
        Args: {
          domain: string;
          project_id: string;
          title: string;
          user_id: string;
        };
        Returns: {
          createdAt: string;
          domain: string;
          id: string;
          isDeleted: boolean;
          marketplaceApprovalStatus: Database["public"]["Enums"]["MarketplaceApprovalStatus"];
          previewImageAssetId: string | null;
          tags: string[] | null;
          title: string;
          userId: string | null;
          workspaceId: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "Project";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_production_build: {
        Args: { deployment: string; project_id: string };
        Returns: string;
      };
      database_cleanup: {
        Args: { from_date?: string; to_date?: string };
        Returns: undefined;
      };
      delete_asset_resource_index_query: {
        Args: { p_project_id: string; p_resource_id: string };
        Returns: boolean;
      };
      delete_stale_asset_file_metadata: {
        Args: { p_asset_ids: string[]; p_project_id: string };
        Returns: number;
      };
      domainsVirtual: {
        Args: { "": Database["public"]["Tables"]["Project"]["Row"] };
        Returns: {
          cname: string;
          createdAt: string;
          domain: string;
          domainId: string;
          domainTxtRecord: string | null;
          error: string | null;
          expectedTxtRecord: string;
          id: string;
          projectId: string;
          status: Database["public"]["Enums"]["DomainStatus"];
          updatedAt: string;
          verified: boolean;
        }[];
        SetofOptions: {
          from: '"Project"';
          to: "domainsVirtual";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      fail_asset_resource_index_build: {
        Args: {
          p_asset_revision: string;
          p_build_attempt_id: string;
          p_build_error: Json;
          p_project_id: string;
          p_query_hash: string;
          p_resource_id: string;
        };
        Returns: boolean;
      };
      finalize_asset_resource_index_garbage: {
        Args: {
          p_gc_claim_id: string;
          p_project_id: string;
          p_resource_id: string;
          p_revision: string;
        };
        Returns: boolean;
      };
      get_unpublishable_asset_resource_indexes: {
        Args: {
          p_asset_revision: string;
          p_project_id: string;
          p_resources: Json;
        };
        Returns: Json;
      };
      latestBuildVirtual:
        | {
            Args: {
              "": Database["public"]["Views"]["DashboardProject"]["Row"];
            };
            Returns: {
              buildId: string;
              createdAt: string;
              domain: string;
              domainsVirtualId: string;
              projectId: string;
              publishStatus: Database["public"]["Enums"]["PublishStatus"];
              updatedAt: string;
            };
            SetofOptions: {
              from: '"DashboardProject"';
              to: "latestBuildVirtual";
              isOneToOne: true;
              isSetofReturn: true;
            };
          }
        | {
            Args: { "": Database["public"]["Tables"]["domainsVirtual"]["Row"] };
            Returns: {
              buildId: string;
              createdAt: string;
              domain: string;
              domainsVirtualId: string;
              projectId: string;
              publishStatus: Database["public"]["Enums"]["PublishStatus"];
              updatedAt: string;
            };
            SetofOptions: {
              from: '"domainsVirtual"';
              to: "latestBuildVirtual";
              isOneToOne: true;
              isSetofReturn: true;
            };
          }
        | {
            Args: { "": Database["public"]["Tables"]["Project"]["Row"] };
            Returns: {
              buildId: string;
              createdAt: string;
              domain: string;
              domainsVirtualId: string;
              projectId: string;
              publishStatus: Database["public"]["Enums"]["PublishStatus"];
              updatedAt: string;
            };
            SetofOptions: {
              from: '"Project"';
              to: "latestBuildVirtual";
              isOneToOne: true;
              isSetofReturn: true;
            };
          };
      latestProjectDomainBuildVirtual: {
        Args: { "": Database["public"]["Tables"]["Project"]["Row"] };
        Returns: {
          buildId: string;
          createdAt: string;
          domain: string;
          domainsVirtualId: string;
          projectId: string;
          publishStatus: Database["public"]["Enums"]["PublishStatus"];
          updatedAt: string;
        };
        SetofOptions: {
          from: '"Project"';
          to: "latestBuildVirtual";
          isOneToOne: true;
          isSetofReturn: true;
        };
      };
      release_asset_resource_index_garbage_claim: {
        Args: {
          p_gc_claim_id: string;
          p_project_id: string;
          p_resource_id: string;
          p_revision: string;
        };
        Returns: boolean;
      };
      remove_asset_resource_index_reference: {
        Args: {
          p_project_id: string;
          p_reference_id: string;
          p_type: Database["public"]["Enums"]["AssetResourceIndexReferenceType"];
        };
        Returns: number;
      };
      replace_asset_file_metadata: {
        Args: {
          p_asset_id: string;
          p_document: Json;
          p_field_contributions: Json;
          p_project_id: string;
          p_revision: string;
          p_source: Json;
        };
        Returns: boolean;
      };
      restore_development_build: {
        Args: { from_build_id: string; project_id: string };
        Returns: string;
      };
      swap_asset_file: {
        Args: {
          asset_id: string;
          expected_name: string;
          project_id: string;
          replacement_name: string;
        };
        Returns: string;
      };
      uuid_generate_v1: { Args: never; Returns: string };
      uuid_generate_v1mc: { Args: never; Returns: string };
      uuid_generate_v3: {
        Args: { name: string; namespace: string };
        Returns: string;
      };
      uuid_generate_v4: { Args: never; Returns: string };
      uuid_generate_v5: {
        Args: { name: string; namespace: string };
        Returns: string;
      };
      uuid_nil: { Args: never; Returns: string };
      uuid_ns_dns: { Args: never; Returns: string };
      uuid_ns_oid: { Args: never; Returns: string };
      uuid_ns_url: { Args: never; Returns: string };
      uuid_ns_x500: { Args: never; Returns: string };
    };
    Enums: {
      AssetResourceIndexBuildStatus:
        | "PENDING"
        | "BUILDING"
        | "ACTIVE"
        | "STALE"
        | "FAILED";
      AssetResourceIndexReferenceType: "RESOURCE" | "BUILD" | "DEPLOYMENT";
      AuthorizationRelation:
        | "viewers"
        | "editors"
        | "builders"
        | "administrators";
      DomainStatus: "INITIALIZING" | "ACTIVE" | "ERROR" | "PENDING";
      MarketplaceApprovalStatus:
        | "UNLISTED"
        | "PENDING"
        | "APPROVED"
        | "REJECTED";
      PublishStatus: "PENDING" | "PUBLISHED" | "FAILED";
      UploadStatus: "UPLOADING" | "UPLOADED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      AssetResourceIndexBuildStatus: [
        "PENDING",
        "BUILDING",
        "ACTIVE",
        "STALE",
        "FAILED",
      ],
      AssetResourceIndexReferenceType: ["RESOURCE", "BUILD", "DEPLOYMENT"],
      AuthorizationRelation: [
        "viewers",
        "editors",
        "builders",
        "administrators",
      ],
      DomainStatus: ["INITIALIZING", "ACTIVE", "ERROR", "PENDING"],
      MarketplaceApprovalStatus: [
        "UNLISTED",
        "PENDING",
        "APPROVED",
        "REJECTED",
      ],
      PublishStatus: ["PENDING", "PUBLISHED", "FAILED"],
      UploadStatus: ["UPLOADING", "UPLOADED"],
    },
  },
} as const;
